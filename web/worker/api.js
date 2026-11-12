import {validDay,planOf,validatePlan,scheduled,tasksOn,progress,targetOf,complete,dailyTotal,needsIncompleteReview,wishlistValueClass,eligibleWishlist} from '../shared/planner.js';
import {writerAlbum} from '../shared/writers.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const saoPauloDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Use the application's D1 binding so Pages-only deploy tokens do not need D1 API access.
const groupSchemaReady=new WeakMap();
async function ensureGroupOrderColumn(db){
 if(!groupSchemaReady.has(db)){
  const ready=(async()=>{
   const hasColumn=async()=>(await db.prepare('PRAGMA table_info(dream_groups)').all()).results.some(c=>c.name==='goal_order');
   if(await hasColumn())return;
   try{await db.prepare("ALTER TABLE dream_groups ADD COLUMN goal_order TEXT NOT NULL DEFAULT '[]'").run()}
   catch(error){if(!await hasColumn())throw error} // Another isolate may have applied it first.
  })();
  groupSchemaReady.set(db,ready);
  ready.catch(()=>groupSchemaReady.delete(db));
 }
 await groupSchemaReady.get(db);
}
const wishlistSchemaReady=new WeakMap();
async function ensureWishlist(db){
 if(!wishlistSchemaReady.has(db)){
  const ready=(async()=>{
   await db.prepare("CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', amount REAL, value_class TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)").run();
   for(const [name,type] of [['amount','REAL'],['value_class',"TEXT NOT NULL DEFAULT ''"]]){
    const has=async()=>(await db.prepare('PRAGMA table_info(wishlist)').all()).results.some(c=>c.name===name);
    if(!await has())try{await db.prepare('ALTER TABLE wishlist ADD COLUMN '+name+' '+type).run()}catch(error){if(!await has())throw error}
   }
   await db.prepare('CREATE INDEX IF NOT EXISTS wishlist_owner_idx ON wishlist(owner,created_at)').run();
  })();wishlistSchemaReady.set(db,ready);ready.catch(()=>wishlistSchemaReady.delete(db));
 }
 await wishlistSchemaReady.get(db);
}
async function availableWishes(db,owner){await ensureWishlist(db);return (await db.prepare('SELECT id,title,link,amount,value_class AS valueClass FROM wishlist WHERE owner=? AND completed=0 ORDER BY created_at,id').bind(owner).all()).results}
// Resolve on the completion mutation, once. The conditional write also protects concurrent check-ins.
const groupRewardSchemaReady=new WeakMap();
async function ensureGroupRewards(db){
 if(!groupRewardSchemaReady.has(db)){
  const ready=(async()=>{for(const [name,type] of [['reward',"TEXT NOT NULL DEFAULT ''"],['reward_config','TEXT']]){
   const has=async()=>(await db.prepare('PRAGMA table_info(dream_groups)').all()).results.some(c=>c.name===name);
   if(!await has())try{await db.prepare('ALTER TABLE dream_groups ADD COLUMN '+name+' '+type).run()}catch(error){if(!await has())throw error}
  }})();groupRewardSchemaReady.set(db,ready);ready.catch(()=>groupRewardSchemaReady.delete(db));
 }await groupRewardSchemaReady.get(db);
}
async function prepareWishlistReward(db,owner,config,old,fallback=''){
 if(!config)return {reward:fallback,config:old||null};
 validatePlan({kind:'habit',weekdays:[0,1,2,3,4,5,6],tasks:[],items:[],notes:'',unit:'',wishlistReward:config});
 if(config.mode==='none')return {reward:'',config:{mode:'none'}};
 if(config.mode==='random-complete'){
  const kept=old?.mode==='random-complete'&&old.itemId?old:null;
  return {reward:kept?.title||'surpresa da wishlist ao realizar',config:kept||{mode:'random-complete',budget:config.budget||'any'}};
 }
 const items=await availableWishes(db,owner),item=items.find(w=>w.id===config.itemId),kept=old?.itemId===config.itemId&&old.title?old:null;
 if(!item&&!kept)throw Error('Não há este item disponível na wishlist. Crie um item ou cancele.');
 if(item&&config.mode==='random-now'&&!eligibleWishlist([item],config.budget||'any').length)throw Error('Este item está fora do limite escolhido. Sorteie novamente ou altere o limite.');
 const chosen=item||{id:kept.itemId,title:kept.title,link:kept.link||''};
 return {reward:chosen.title,config:{mode:config.mode,budget:config.budget||'any',itemId:chosen.id,title:chosen.title,link:chosen.link}};
}
async function resolveGroupReward(db,owner,id,known){
 await ensureGroupRewards(db);
 const row=known||(await db.prepare('SELECT id,name,reward,reward_config FROM dream_groups WHERE id=? AND owner=?').bind(id,owner).all()).results[0];
 if(!row)return null;
 let group={...row,rewardConfig:row.rewardConfig??(row.reward_config?JSON.parse(row.reward_config):null)};
 const config=group.rewardConfig;
 if(config?.mode!=='random-complete'||config.itemId)return group;
 const members=(await goals(db,owner)).filter(g=>g.group_id===id);
 if(!members.length||!members.every(complete))return group;
 const items=eligibleWishlist(await availableWishes(db,owner),config.budget||'any');
 if(!items.length)return {...group,reward:'nenhum item disponível para este sorteio'};
 const item=items[crypto.getRandomValues(new Uint32Array(1))[0]%items.length];
 await db.prepare("UPDATE dream_groups SET reward=?,reward_config=json_set(reward_config,'$.itemId',?,'$.title',?,'$.link',?) WHERE id=? AND owner=? AND json_extract(reward_config,'$.mode')='random-complete' AND json_extract(reward_config,'$.itemId') IS NULL").bind(item.title,item.id,item.title,item.link,id,owner).run();
 const updated=(await db.prepare('SELECT reward,reward_config FROM dream_groups WHERE id=? AND owner=?').bind(id,owner).all()).results[0];
 return {...group,reward:updated.reward,rewardConfig:JSON.parse(updated.reward_config)};
}
async function rewardGoal(db,owner,id){
 let g=await goals(db,owner,id),config=g?.plan?.wishlistReward;
 if(!g)return g;
 if(config?.mode==='random-complete'&&!config.itemId&&complete(g)){
  const items=eligibleWishlist(await availableWishes(db,owner),config.budget||'any');
  if(!items.length)g.reward='nenhum item disponível para este sorteio';
  else{
   const item=items[crypto.getRandomValues(new Uint32Array(1))[0]%items.length];
   await db.prepare("UPDATE goals SET reward=?,plan=json_set(plan,'$.wishlistReward.itemId',?,'$.wishlistReward.title',?,'$.wishlistReward.link',?) WHERE id=? AND owner=? AND json_extract(plan,'$.wishlistReward.mode')='random-complete' AND json_extract(plan,'$.wishlistReward.itemId') IS NULL").bind(item.title,item.id,item.title,item.link,id,owner).run();
   g=await goals(db,owner,id);
  }
 }
 if(g.group_id)g.groupReward=await resolveGroupReward(db,owner,g.group_id);
 return g;
}
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
 if(id==='wishlist'){
  await ensureWishlist(env.DB);
  const wishId=action;
  const list=async()=>(await env.DB.prepare('SELECT id,title,notes,link,amount,value_class AS valueClass,completed,created_at FROM wishlist WHERE owner=? ORDER BY created_at DESC,id').bind(owner).all()).results;
  if(request.method==='GET'&&!wishId)return json(await list());
  const existing=wishId?(await list()).find(w=>w.id===wishId):null;
  if(wishId&&!existing)return json({error:'Este desejo não foi encontrado.'},404);
  if(request.method==='DELETE'&&wishId){await env.DB.prepare('DELETE FROM wishlist WHERE id=? AND owner=?').bind(wishId,owner).run();return json({ok:true})}
  if(request.method==='POST'&&!wishId||request.method==='PATCH'&&wishId){
   const next={...existing,...body};
   if(typeof next.title!=='string'||!next.title.trim()||next.title.trim().length>160)return json({error:'Escreva um desejo com até 160 caracteres.'},400);
   if(next.notes!==undefined&&(typeof next.notes!=='string'||next.notes.length>2000))return json({error:'Use até 2.000 caracteres na observação.'},400);
   if(next.link!==undefined&&(typeof next.link!=='string'||next.link.length>2000))return json({error:'Use um link com até 2.000 caracteres.'},400);
   const link=(next.link||'').trim();
   if(link){try{const url=new URL(link);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error()}catch{return json({error:'Informe um link começando com https:// ou http://.'},400)}}
   if(next.completed!==undefined&&![true,false,0,1].includes(next.completed))return json({error:'Estado do desejo inválido.'},400);
   const amount=next.amount??null;
   if(amount!==null&&(!Number.isFinite(amount)||amount<0||amount>1000000000||Math.abs(Math.round(amount*100)-amount*100)>.00001))return json({error:'Informe um valor positivo ou zero, com até duas casas decimais.'},400);
   if(next.valueClass!=null&&!['','small','medium','high','large'].includes(next.valueClass))return json({error:'Escolha uma classificação de valor válida.'},400);
   const valueClass=wishlistValueClass({amount,valueClass:next.valueClass||''});
   const item={id:wishId||crypto.randomUUID(),title:next.title.trim(),notes:(next.notes||'').trim(),link,amount,valueClass,completed:next.completed?1:0,created_at:existing?.created_at||new Date().toISOString()};
   if(existing)await env.DB.prepare('UPDATE wishlist SET title=?,notes=?,link=?,amount=?,value_class=?,completed=? WHERE id=? AND owner=?').bind(item.title,item.notes,item.link,item.amount,item.valueClass,item.completed,item.id,owner).run();
   else await env.DB.prepare('INSERT INTO wishlist (id,owner,title,notes,link,amount,value_class,completed,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(item.id,owner,item.title,item.notes,item.link,item.amount,item.valueClass,item.completed,item.created_at).run();
   return json(item,existing?200:201);
  }
  return json({error:'Ação não permitida.'},405);
 }
 if(id==='album'){
  if(request.method!=='GET'||action)return json({error:'Ação não permitida.'},405);
  return json(writerAlbum(url.searchParams.get('demo')==='1'?[]:await goals(env.DB,owner),{demo:url.searchParams.get('demo')==='1'}));
 }
 if(id==='portraits'){
  if(request.method!=='GET')return json({error:'Ação não permitida.'},405);
  const demo=action==='demo',index=Number(action)-1;
  if(!demo&&(!/^(0[1-9]|10)$/.test(action||'')||(await goals(env.DB,owner)).filter(complete).length<=index*8))return json({error:'Retrato ainda não revelado.'},404);
  if(!env.ASSETS)return json({error:'Retrato temporariamente indisponível.'},503);
  const image=await env.ASSETS.fetch(new Request(new URL('/writers/'+(demo?'01':action)+'.webp',request.url)));
  const headers=new Headers(image.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');
  return new Response(image.body,{status:image.status,headers});
 }
 if(id==='groups'){
  await ensureGroupOrderColumn(env.DB);await ensureGroupRewards(env.DB);
  const groupId=action;
  const list=async()=>Promise.all((await env.DB.prepare('SELECT id,name,created_at,goal_order,reward,reward_config FROM dream_groups WHERE owner=? ORDER BY created_at,id').bind(owner).all()).results.map(g=>resolveGroupReward(env.DB,owner,g.id,{...g,goalOrder:JSON.parse(g.goal_order),rewardConfig:g.reward_config?JSON.parse(g.reward_config):null})));
  if(request.method==='GET'&&!groupId)return json(await list());
  if(groupId&&!(await list()).some(g=>g.id===groupId))return json({error:'Este Big Dream não foi encontrado.'},404);
  if(request.method==='DELETE'&&groupId){
   await env.DB.batch([env.DB.prepare('UPDATE goals SET group_id=NULL WHERE group_id=? AND owner=?').bind(groupId,owner),env.DB.prepare('DELETE FROM dream_groups WHERE id=? AND owner=?').bind(groupId,owner)]);
   return json({ok:true});
  }
  if(request.method==='POST'&&!groupId||request.method==='PATCH'&&groupId){
   if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>80)return json({error:'Dê um nome ao Big Dream, com até 80 caracteres.'},400);
   const name=body.name.trim(),known=await list();
   if(known.some(g=>g.id!==groupId&&g.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return json({error:'Já existe um Big Dream com esse nome.'},400);
   if(body.goalIds!==undefined&&(!Array.isArray(body.goalIds)||body.goalIds.some(v=>typeof v!=='string')||new Set(body.goalIds).size!==body.goalIds.length))return json({error:'Escolha tydreams válidos para o Big Dream.'},400);
   if(body.goalOrder!==undefined){
    if(!groupId||!Array.isArray(body.goalOrder)||body.goalOrder.some(v=>typeof v!=='string')||new Set(body.goalOrder).size!==body.goalOrder.length)return json({error:'Escolha uma ordem válida para os tydreams.'},400);
    const members=(await goals(env.DB,owner)).filter(g=>g.group_id===groupId);
    if(body.goalOrder.length!==members.length||body.goalOrder.some(id=>!members.some(g=>g.id===id)))return json({error:'Os tydreams deste Big Dream mudaram. Feche e abra os ajustes para tentar novamente.'},400);
   }
   const owned=body.goalIds!==undefined?await goals(env.DB,owner):[];
   if(body.goalIds?.some(id=>!owned.some(g=>g.id===id)))return json({error:'Um dos tydreams não foi encontrado.'},400);
   const gid=groupId||crypto.randomUUID(),statements=[groupId?env.DB.prepare('UPDATE dream_groups SET name=? WHERE id=? AND owner=?').bind(name,gid,owner):env.DB.prepare('INSERT INTO dream_groups (id,owner,name,created_at) VALUES (?,?,?,?)').bind(gid,owner,name,new Date().toISOString())];
   if(body.rewardConfig!==undefined){
    let prepared;try{prepared=await prepareWishlistReward(env.DB,owner,body.rewardConfig,known.find(g=>g.id===groupId)?.rewardConfig)}catch(error){return json({error:error.message},400)}
    statements.push(env.DB.prepare('UPDATE dream_groups SET reward=?,reward_config=? WHERE id=? AND owner=?').bind(prepared.reward,prepared.config?JSON.stringify(prepared.config):null,gid,owner));
   }
   if(body.goalOrder!==undefined)statements.push(env.DB.prepare('UPDATE dream_groups SET goal_order=? WHERE id=? AND owner=?').bind(JSON.stringify(body.goalOrder),gid,owner));
   if(body.goalIds!==undefined){
    statements.push(env.DB.prepare('UPDATE goals SET group_id=NULL WHERE group_id=? AND owner=?').bind(gid,owner));
    for(const goalId of body.goalIds)statements.push(env.DB.prepare('UPDATE goals SET group_id=? WHERE id=? AND owner=?').bind(gid,goalId,owner));
   }
   await env.DB.batch(statements);return json((await list()).find(g=>g.id===gid),groupId?200:201);
  }
  return json({error:'Ação não permitida para este Big Dream.'},405);
 }
 if(request.method==='GET'&&!id)return json(await goals(env.DB,owner));
 const existing=id?await goals(env.DB,owner,id):null;if(id&&!existing)return json({error:'Este sonho não foi encontrado.'},404);
 if(request.method==='POST'&&action==='incomplete'){
  if(!needsIncompleteReview(existing,saoPauloDay()))return json({error:'Este sonho ainda não terminou ou já atingiu a meta.'},400);
  const plan={...planOf(existing),incompleteAccepted:true};
  await env.DB.prepare('UPDATE goals SET plan=? WHERE id=? AND owner=?').bind(JSON.stringify(plan),id,owner).run();
  return json(await rewardGoal(env.DB,owner,id));
 }
 if(request.method==='POST'&&action==='outcome'){
  const p=planOf(existing),day=body.day,status=body.status;
  if(p.kind!=='habit'||!validDay(day)||(day>saoPauloDay()&&status!=='skipped'&&status!==null)||!['success','failure','skipped',null].includes(status))return json({error:'Escolha um dia válido até hoje e seu resultado.'},400);
  if(body.note!=null&&(typeof body.note!=='string'||body.note.length>2000))return json({error:'Use até 2000 caracteres para a observação.'},400);
  if(status&&!scheduled({...existing,plan:{...p,skippedDays:[]}},day))return json({error:'Este dia está fora da rotina ou do período do sonho.'},400);
  if(day>=saoPauloDay()&&status==='success'&&p.dailyTarget&&dailyTotal(existing,day)<p.dailyTarget)return json({error:'Registre a quantidade deste dia antes de concluí-lo.'},400);
  if(day>=saoPauloDay()&&status==='success'&&p.tasks.length&&!tasksOn(existing,day).every(t=>existing.entries.some(e=>e.key===`${day}:${t.id}`)))return json({error:'Conclua as tarefas previstas para este dia.'},400);
  if((status==='skipped'||status==='failure'&&day>=saoPauloDay())&&(p.dailyTarget&&dailyTotal(existing,day)>=p.dailyTarget||p.tasks.length&&tasksOn(existing,day).every(t=>existing.entries.some(e=>e.key===`${day}:${t.id}`))))return json({error:'Corrija os registros deste dia antes de marcá-lo como falha.'},400);
  const statements=[env.DB.prepare('DELETE FROM checkins WHERE goal_id=? AND day=?').bind(id,day),env.DB.prepare('DELETE FROM day_failures WHERE goal_id=? AND day=?').bind(id,day)];
  if(status==='success')statements.push(env.DB.prepare('INSERT INTO checkins (goal_id,day) VALUES (?,?)').bind(id,day));
  if(status==='failure')statements.push(env.DB.prepare('INSERT INTO day_failures (goal_id,day) VALUES (?,?)').bind(id,day));
  if(status===null&&(p.tasks.length||p.dailyTarget))statements.push(env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=? AND day=?').bind(id,day));
  const plan={...p,...(p.impulse?{impulseResets:{...(p.impulseResets||{}),...(status==='failure'&&(!existing.failures.includes(day)||body.restart===true)?{[day]:day===saoPauloDay()?new Date().toISOString():day+'T00:00:00-03:00'}:{})}}:{}),skippedDays:[...(p.skippedDays||[]).filter(d=>d!==day),...(status==='skipped'?[day]:[])],dayNotes:{...(p.dayNotes||{}),...(body.note!=null?{[day]:body.note.trim()}:{})}};
  statements.push(env.DB.prepare('UPDATE goals SET plan=? WHERE id=? AND owner=?').bind(JSON.stringify(plan),id,owner));
  const updated={...existing,plan,days:[...existing.days.filter(d=>d!==day),...(status==='success'?[day]:[])],failures:[...existing.failures.filter(d=>d!==day),...(status==='failure'?[day]:[])]};
  statements.push(env.DB.prepare('UPDATE goals SET redeemed=CASE WHEN ? THEN redeemed ELSE 0 END WHERE id=? AND owner=?').bind(complete(updated)?1:0,id,owner));
  await env.DB.batch(statements);return json(await rewardGoal(env.DB,owner,id));
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
  await env.DB.batch(statements);return json(await rewardGoal(env.DB,owner,id));
 }
 if(request.method==='POST'&&action==='redeem'){
  if(!complete(existing))return json({error:'Sua recompensa ainda está crescendo. Continue cuidando do sonho.'},400);
  await env.DB.prepare('UPDATE goals SET redeemed=1 WHERE id=? AND owner=?').bind(id,owner).run();return json(await rewardGoal(env.DB,owner,id));
 }
 if(request.method==='DELETE'&&id&&!action){await env.DB.batch([env.DB.prepare('DELETE FROM day_failures WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM goal_entries WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM checkins WHERE goal_id=?').bind(id),env.DB.prepare('DELETE FROM goals WHERE id=? AND owner=?').bind(id,owner)]);return json({ok:true})}
 if((request.method==='POST'&&!id)||(request.method==='PATCH'&&id&&!action)){
  if(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>100||typeof body.reward!=='string'||body.reward.trim().length>160||!Number.isFinite(body.target)||body.target<1||body.target>1000000000||!['lavender','peach','sage'].includes(body.color))return json({error:'Preencha o nome e uma meta válida.'},400);
  let plan=body.plan??existing?.plan??null;
  try{if(plan)plan=validatePlan(plan)}catch(e){return json({error:e.message},400)}
  if((!plan||plan.kind==='habit')&&(!Number.isInteger(body.target)||body.target>3650))return json({error:'Use uma meta de 1 a 3650 dias.'},400);
  if(existing&&planOf(existing).kind!==(plan?.kind||'habit')&&(existing.days.length||existing.entries.length||existing.failures.length))return json({error:'Crie outro sonho para mudar o tipo sem perder seu histórico.'},400);
  // Equivalent task counters retain entry keys, values, check-ins and corrections.
  const oldPlan=existing&&planOf(existing);
  const counterConversion=body.convertTasksToCounter===true&&oldPlan?.kind==='habit'&&oldPlan.tasks.length>0&&plan?.dailyCounter===true&&plan.dailyTarget===oldPlan.tasks.length&&plan.tasks.length===0&&!plan.dailyList&&oldPlan.tasks.every(t=>JSON.stringify([...t.weekdays].sort())===JSON.stringify([...oldPlan.weekdays].sort()))&&['start','end','unit','completionMode'].every(k=>plan[k]===oldPlan[k])&&JSON.stringify(plan.weekdays)===JSON.stringify(oldPlan.weekdays)&&existing.entries.every(e=>e.value===1&&oldPlan.tasks.some(t=>e.key===`${e.day}:${t.id}`));
  if(body.convertTasksToCounter===true&&!counterConversion)return json({error:'Esta rotina não pode ser convertida sem alterar o histórico.'},400);
  if(!counterConversion&&existing?.entries.length&&planOf(existing).kind==='habit'&&(Boolean(planOf(existing).dailyTarget)!==Boolean(plan?.dailyTarget)||(planOf(existing).dailyTarget&&planOf(existing).unit!==plan.unit)))return json({error:'Crie outro hábito para mudar a unidade ou a forma de medir sem misturar registros.'},400);
  const groupId=body.groupId===undefined?(existing?.group_id??null):body.groupId;
  if(groupId!==null&&(typeof groupId!=='string'||!(await env.DB.prepare('SELECT id FROM dream_groups WHERE id=? AND owner=?').bind(groupId,owner).all()).results.length))return json({error:'Escolha um Big Dream válido.'},400);
  if(plan){
   plan={...plan};delete plan.incompleteAccepted;
   const stillIncomplete=needsIncompleteReview({...existing,target:body.target,plan},saoPauloDay());
   if(body.reopen===true&&stillIncomplete)return json({error:'Ajuste o prazo ou a meta para voltar a acompanhar este sonho.'},400);
   if(existing?.plan?.incompleteAccepted&&stillIncomplete)plan.incompleteAccepted=true;
  }
  let reward=body.reward.trim();
  if(plan?.wishlistReward){
   try{const prepared=await prepareWishlistReward(env.DB,owner,plan.wishlistReward,existing?.plan?.wishlistReward,reward);reward=prepared.reward;plan={...plan,wishlistReward:prepared.config}}catch(error){return json({error:error.message},400)}
  }
  const gid=id||crypto.randomUUID(),target=targetOf({target:body.target,plan});
  if(id)await env.DB.prepare('UPDATE goals SET title=?,reward=?,target=?,color=?,plan=?,group_id=?,redeemed=0 WHERE id=? AND owner=?').bind(body.title.trim(),reward,target,body.color,plan?JSON.stringify(plan):null,groupId,id,owner).run();
  else await env.DB.prepare('INSERT INTO goals (id,owner,title,reward,target,color,plan,group_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(gid,owner,body.title.trim(),reward,target,body.color,plan?JSON.stringify(plan):null,groupId,new Date().toISOString()).run();
  return json(await rewardGoal(env.DB,owner,gid),id?200:201);
 }
 return json({error:'Caminho não encontrado.'},404);
}
