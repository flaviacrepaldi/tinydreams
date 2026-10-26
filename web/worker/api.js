import {validDay,planOf,validatePlan,scheduled,tasksOn,progress,targetOf,complete,dailyTotal} from '../shared/planner.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const saoPauloDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function goals(db,owner,id){
 // Read outcomes and successes in one snapshot so a correction never appears in both states.
 const [rows,days,entries,failures]=await db.batch([
  db.prepare('SELECT * FROM goals WHERE owner = ? ORDER BY created_at ASC').bind(owner),
  db.prepare('SELECT c.goal_id, c.day FROM checkins c JOIN goals g ON c.goal_id=g.id WHERE g.owner = ? ORDER BY c.day').bind(owner),
  db.prepare('SELECT e.* FROM goal_entries e JOIN goals g ON e.goal_id=g.id WHERE g.owner=? ORDER BY e.day,e.entry_key').bind(owner),
  db.prepare('SELECT f.goal_id,f.day FROM day_failures f JOIN goals g ON f.goal_id=g.id WHERE g.owner=? ORDER BY f.day').bind(owner)
 ]);
 const result=rows.results.map(g=>({...g,plan:g.plan?JSON.parse(g.plan):null,failures:failures.results.filter(f=>f.goal_id===g.id).map(f=>f.day),days:days.results.filter(d=>d.goal_id===g.id).map(d=>d.day),entries:entries.results.filter(e=>e.goal_id===g.id).map(e=>({key:e.entry_key,day:e.day,value:e.value,note:e.note}))})).map(g=>({...g,target:targetOf(g),redeemed:complete(g)?g.redeemed:0}));return id?result.find(g=>g.id===id):result;
}
export async function api(request,env){
 const url=new URL(request.url),owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return json({error:'Entre na sua conta para abrir seu jardim.'},401);
 if(!env.DB)return json({error:'O jardim está temporariamente indisponível. Tente novamente em instantes.'},503);
 if(!['GET','POST','PATCH','DELETE'].includes(request.method))return json({error:'Ação não permitida.'},405);
 if(request.method!=='GET'&&((request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({error:'Origem não permitida.'},403);
 const parts=url.pathname.split('/').filter(Boolean),id=parts[2],action=parts[3];
 if(parts.length>4)return json({error:'Caminho não encontrado.'},404);
 let body={};
 if(['POST','PATCH'].includes(request.method)){
  const raw=await request.text();if(raw.length>48000)return json({error:'Texto grande demais.'},413);
  try{body=raw?JSON.parse(raw):{}}catch{return json({error:'Dados inválidos.'},400)}
  if(!body||Array.isArray(body)||typeof body!=='object')return json({error:'Dados inválidos.'},400);
 }
 if(request.method==='GET'&&!id)return json(await goals(env.DB,owner));
 const existing=id?await goals(env.DB,owner,id):null;if(id&&!existing)return json({error:'Este sonho não foi encontrado.'},404);
 if(request.method==='POST'&&action==='outcome'){
  const p=planOf(existing),day=body.day,status=body.status;
  if(p.kind!=='habit'||!validDay(day)||day>saoPauloDay()||!['success','failure',null].includes(status))return json({error:'Escolha um dia válido até hoje e seu resultado.'},400);
  if(status&&!scheduled(existing,day))return json({error:'Este dia está fora da rotina ou do período do sonho.'},400);
  if(status==='success'&&p.dailyTarget&&dailyTotal(existing,day)<p.dailyTarget)return json({error:'Registre a quantidade deste dia antes de concluí-lo.'},400);
  if(status==='success'&&p.tasks.length&&!tasksOn(existing,day).every(t=>existing.entries.some(e=>e.key===`${day}:${t.id}`)))return json({error:'Conclua as tarefas previstas para este dia.'},400);
  if(status==='failure'&&(p.dailyTarget&&dailyTotal(existing,day)>=p.dailyTarget||p.tasks.length&&tasksOn(existing,day).every(t=>existing.entries.some(e=>e.key===`${day}:${t.id}`))))return json({error:'Corrija os registros deste dia antes de marcá-lo como falha.'},400);
  const statements=[env.DB.prepare('DELETE FROM checkins WHERE goal_id=? AND day=?').bind(id,day),env.DB.prepare('DELETE FROM day_failures WHERE goal_id=? AND day=?').bind(id,day)];
  if(status==='success')statements.push(env.DB.prepare('INSERT INTO checkins (goal_id,day) VALUES (?,?)').bind(id,day));
  if(status==='failure')statements.push(env.DB.prepare('INSERT INTO day_failures (goal_id,day) VALUES (?,?)').bind(id,day));
  if(status===null&&(p.tasks.length||p.dailyTarget))statements.push(env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=? AND day=?').bind(id,day));
  statements.push(env.DB.prepare('UPDATE goals SET redeemed=CASE WHEN (SELECT COUNT(*) FROM checkins WHERE goal_id=?) < ? THEN 0 ELSE redeemed END WHERE id=? AND owner=?').bind(id,targetOf(existing),id,owner));
  await env.DB.batch(statements);return json(await goals(env.DB,owner,id));
 }
 if(request.method==='POST'&&['check','entry'].includes(action)){
  const p=planOf(existing),day=body.day;
  if(!validDay(day)||day>saoPauloDay())return json({error:'Escolha uma data válida até hoje.'},400);
  if(typeof body.done!=='boolean')return json({error:'Informe se o registro foi feito.'},400);
  const statements=[];
  if(action==='check'){
   if(p.kind!=='habit'||((p.tasks.length||p.dailyTarget)&&body.done))return json({error:'Registre as tarefas ou etapas deste sonho.'},400);
   if(!body.done&&(p.tasks.length||p.dailyTarget))statements.push(env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=? AND day=?').bind(id,day));
   if(body.done&&!scheduled(existing,day))return json({error:'Este dia está fora da rotina ou do período do sonho.'},400);
   statements.push(body.done?env.DB.prepare('INSERT INTO checkins (goal_id,day) VALUES (?,?) ON CONFLICT(goal_id,day) DO NOTHING').bind(id,day):env.DB.prepare('DELETE FROM checkins WHERE goal_id=? AND day=?').bind(id,day));
  }else{
   const key=body.key;let value=1;
   if(typeof key!=='string'||!/^[-\w:]{1,100}$/.test(key))return json({error:'Registro inválido.'},400);
   if(p.kind==='list'){
    if(!p.items.some(i=>i.id===key))return json({error:'Etapa não encontrada.'},400);
   }else if(p.kind==='habit'&&p.impulse){
    if(!key.startsWith('urge:'))return json({error:'Registro de impulso inválido.'},400);
   }else if(p.kind==='habit'&&!p.dailyTarget){
    const task=tasksOn(existing,day).find(t=>`${day}:${t.id}`===key);
    if(!task)return json({error:'Tarefa não prevista para este dia.'},400);
   }else{
    value=body.value;if(body.done&&(!Number.isFinite(value)||value<=0||value>1000000000||Math.round(value*100)!==value*100&&Math.abs(Math.round(value*100)-value*100)>0.00001))return json({error:'Informe um valor positivo com até duas casas decimais.'},400);
    if(!body.done)value=1;
   }
   if(body.done&&((p.start&&day<p.start)||(p.end&&day>p.end)||(p.kind==='habit'&&!scheduled(existing,day))))return json({error:'Escolha uma data dentro do período e da rotina do sonho.'},400);
   const note=body.note??'';if(typeof note!=='string'||note.length>300)return json({error:'Use até 300 caracteres para a anotação.'},400);
   statements.push(body.done?env.DB.prepare('INSERT INTO goal_entries (goal_id,entry_key,day,value,note) VALUES (?,?,?,?,?) ON CONFLICT(goal_id,entry_key) DO UPDATE SET day=excluded.day,value=excluded.value,note=excluded.note').bind(id,key,day,value,note):env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=? AND entry_key=?').bind(id,key));
   if(p.kind==='habit'&&p.dailyTarget){
    const old=(existing.entries||[]).find(e=>e.key===key);
    if(old&&old.day!==day)return json({error:'Remova o registro antes de alterar sua data.'},400);
    // Compute completion inside the same transaction as the contribution, including concurrent additions.
    statements.push(env.DB.prepare('INSERT INTO checkins (goal_id,day) SELECT ?,? WHERE (SELECT COALESCE(ROUND(SUM(value),2),0) FROM goal_entries WHERE goal_id=? AND day=?) >= ? ON CONFLICT(goal_id,day) DO NOTHING').bind(id,day,id,day,p.dailyTarget));
    statements.push(env.DB.prepare('DELETE FROM checkins WHERE goal_id=? AND day=? AND (SELECT COALESCE(ROUND(SUM(value),2),0) FROM goal_entries WHERE goal_id=? AND day=?) < ?').bind(id,day,id,day,p.dailyTarget));
   }else if(p.kind==='habit'&&!p.impulse){
    const records=(existing.entries||[]).filter(e=>e.key!==key);if(body.done)records.push({key});
    const done=tasksOn(existing,day).every(t=>records.some(e=>e.key===`${day}:${t.id}`));
    statements.push(done?env.DB.prepare('INSERT INTO checkins (goal_id,day) VALUES (?,?) ON CONFLICT(goal_id,day) DO NOTHING').bind(id,day):env.DB.prepare('DELETE FROM checkins WHERE goal_id=? AND day=?').bind(id,day));
   }
  }
  if(p.kind==='habit'&&(action==='check'&&body.done||!p.impulse&&action==='entry'))statements.push(env.DB.prepare('DELETE FROM day_failures WHERE goal_id=? AND day=? AND EXISTS (SELECT 1 FROM checkins WHERE goal_id=? AND day=?)').bind(id,day,id,day));
  statements.push(env.DB.prepare('UPDATE goals SET redeemed=0 WHERE id=? AND owner=?').bind(id,owner));
  await env.DB.batch(statements);return json(await goals(env.DB,owner,id));
 }
 if(request.method==='POST'&&action==='redeem'){
  if(!complete(existing))return json({error:'Sua recompensa ainda está crescendo. Continue cuidando do sonho.'},400);
  await env.DB.prepare('UPDATE goals SET redeemed=1 WHERE id=? AND owner=?').bind(id,owner).run();return json(await goals(env.DB,owner,id));
 }
 if(request.method==='DELETE'&&id&&!action){await env.DB.batch([env.DB.prepare('DELETE FROM day_failures WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM checkins WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM goals WHERE id=? AND owner=?').bind(id,owner)]);return json({ok:true})}
 if((request.method==='POST'&&!id)||(request.method==='PATCH'&&id&&!action)){
  if(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>100||typeof body.reward!=='string'||body.reward.trim().length>160||!Number.isFinite(body.target)||body.target<1||body.target>1000000000||!['lavender','peach','sage'].includes(body.color))return json({error:'Preencha o nome e uma meta válida.'},400);
  let plan=body.plan??existing?.plan??null;
  try{if(plan)plan=validatePlan(plan)}catch(e){return json({error:e.message},400)}
  if((!plan||plan.kind==='habit')&&(!Number.isInteger(body.target)||body.target>3650))return json({error:'Use uma meta de 1 a 3650 dias.'},400);
  if(existing&&planOf(existing).kind!==(plan?.kind||'habit')&&(existing.days.length||existing.entries.length||existing.failures.length))return json({error:'Crie outro sonho para mudar o tipo sem perder seu histórico.'},400);
  if(existing?.entries.length&&planOf(existing).kind==='habit'&&(Boolean(planOf(existing).dailyTarget)!==Boolean(plan?.dailyTarget)||(planOf(existing).dailyTarget&&planOf(existing).unit!==plan.unit)))return json({error:'Crie outro hábito para mudar a unidade ou a forma de medir sem misturar registros.'},400);
  const gid=id||crypto.randomUUID(),target=targetOf({target:body.target,plan});
  if(id)await env.DB.prepare('UPDATE goals SET title=?,reward=?,target=?,color=?,plan=?,redeemed=0 WHERE id=? AND owner=?').bind(body.title.trim(),body.reward.trim(),target,body.color,plan?JSON.stringify(plan):null,id,owner).run();
  else await env.DB.prepare('INSERT INTO goals (id,owner,title,reward,target,color,plan,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(gid,owner,body.title.trim(),body.reward.trim(),target,body.color,plan?JSON.stringify(plan):null,new Date().toISOString()).run();
  return json(await goals(env.DB,owner,gid),id?200:201);
 }
 return json({error:'Caminho não encontrado.'},404);
}
