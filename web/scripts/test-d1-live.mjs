// Explicit opt-in integration check. Creates and removes only its own test records.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {remoteD1} from './d1.mjs';
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const db=remoteD1({accountId:config.account_id,databaseId:config.d1_databases.find(b=>b.binding==='DB').database_id});
const base='http://localhost:4173/api/goals';
async function call(path='',method='GET',body){const response=await fetch(base+path,{method,headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.ok(response.ok,`Request failed: ${response.status}`);return result;}
let id;const rollbackId=crypto.randomUUID();
try{
  const g=await call('','POST',{title:'Teste temporário de conexão D1',reward:'Teste, será apagado',target:1,color:'sage'});id=g.id;
  const stored=await db.prepare('SELECT id FROM goals WHERE id=?').bind(id).all();assert.equal(stored.results[0]?.id,id);
  assert.ok((await call()).some(g=>g.id===id));
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  assert.equal((await call('/'+id+'/check','POST',{day,done:true})).days.length,1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM checkins WHERE goal_id=?').bind(id).all()).results[0].count,1);
  assert.equal((await call('/'+id+'/check','POST',{day,done:true})).days.length,1);
  assert.equal((await call('/'+id+'/redeem','POST',{})).redeemed,1);
  const undone=await call('/'+id+'/check','POST',{day,done:false});assert.equal(undone.days.length,0);assert.equal(undone.redeemed,0);
  const insert=db.prepare('INSERT INTO goals (id,owner,title,reward,target,color,created_at) VALUES (?,?,?,?,?,?,?)').bind(rollbackId,'d1-integration-test','Rollback fixture','test',1,'sage',new Date().toISOString());
  await assert.rejects(()=>db.batch([insert,insert]));
  assert.equal((await db.prepare('SELECT id FROM goals WHERE id=?').bind(rollbackId).all()).results.length,0,'D1 batch must roll back all statements on failure');
  console.log('PASS: local HTTP API writes to real Cloudflare D1; independent remote reads confirm persistence, idempotent check-ins, rewards, undo, and atomic rollback.');
}finally{
  if(id)await call('/'+id,'DELETE');
  await db.prepare('DELETE FROM goals WHERE id=?').bind(rollbackId).run();
  if(id)assert.equal((await db.prepare('SELECT id FROM goals WHERE id=?').bind(id).all()).results.length,0);
  console.log('Temporary D1 test records removed.');
}
