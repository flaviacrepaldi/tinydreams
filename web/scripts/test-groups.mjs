import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {api} from '../worker/api.js';
import {localDB} from './sqlite.mjs';
import {migratePlanner} from './migrate-planner.mjs';
const dir=mkdtempSync(join(tmpdir(),'tiny-groups-')),path=join(dir,'test.sqlite');
// Start with an actual pre-feature database and earned progress.
const legacy=new DatabaseSync(path);
for(const file of ['0000_gentle_moon.sql','0001_personal_planner.sql','0002_daily_outcomes.sql'])legacy.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
legacy.prepare('INSERT INTO goals(id,owner,title,reward,target,color,created_at,redeemed) VALUES (?,?,?,?,?,?,?,?)').run('legacy','groups-owner','Meu sonho','Livro',1,'sage','2026-01-01',1);
legacy.prepare('INSERT INTO checkins(goal_id,day) VALUES (?,?)').run('legacy','2026-01-01');legacy.close();
let DB=localDB(path);
async function call(path='',method='GET',body,owner='groups-owner'){
 const r=await api(new Request('https://test/api/goals'+path,{method,headers:{'oai-authenticated-user-id':owner},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json()};
}
const dream={title:'Outro tydream',reward:'',target:4,color:'lavender'};
try{
 await migratePlanner(DB);await migratePlanner(DB);
 assert.equal((await call()).data[0].days.length,1);assert.equal((await call()).data[0].redeemed,1);assert.equal((await call()).data[0].group_id,null);
 assert.deepEqual((await call('/groups')).data,[]);
 for(const name of ['', ' '.repeat(3),'a'.repeat(81),42])assert.equal((await call('/groups','POST',{name})).status,400);
 const first=await call('/groups','POST',{name:'Leituras',goalIds:['legacy']});assert.equal(first.status,201);const id=first.data.id;
 let saved=(await call()).data[0];assert.equal(saved.group_id,id);assert.equal(saved.redeemed,1);assert.deepEqual(saved.days,['2026-01-01']);
 assert.equal((await call('/groups','POST',{name:'leituras'})).status,400);
 assert.deepEqual((await call('/groups','GET',null,'another-owner')).data,[]);
 assert.equal((await call('/groups/'+id,'PATCH',{name:'Roubar'},'another-owner')).status,404);
 assert.equal((await call('/groups/'+id,'DELETE',null,'another-owner')).status,404);
 assert.equal((await call('','POST',{...dream,groupId:id},'another-owner')).status,400);
 const second=(await call('/groups','POST',{name:'Projeto pessoal'})).data;
 const g=(await call('','POST',{...dream,groupId:id})).data;assert.equal(g.group_id,id);
 assert.equal((await call('/'+g.id,'PATCH',dream)).data.group_id,id,'Legacy PATCH must preserve membership');
 assert.equal((await call('/groups/'+second.id,'PATCH',{name:'Projeto pessoal',goalIds:['legacy']})).status,200);
 assert.equal((await call()).data.find(g=>g.id==='legacy').group_id,second.id);
 assert.equal((await call('/groups/'+second.id,'PATCH',{name:'Projeto pessoal',goalIds:['legacy','missing']})).status,400);
 assert.equal((await call('/groups/'+second.id,'PATCH',{name:'Projeto pessoal',goalIds:['legacy','legacy']})).status,400);
 assert.equal((await call()).data.find(g=>g.id==='legacy').group_id,second.id,'Invalid selection must be atomic');
 await call('/groups/'+second.id,'PATCH',{name:'Meu Big Dream'});
 DB=localDB(path);assert.equal((await call('/groups')).data.find(g=>g.id===second.id).name,'Meu Big Dream','Persist after reconnect');
 assert.equal((await call('/'+g.id,'PATCH',{...dream,groupId:null})).data.group_id,null);
 assert.equal((await call('/groups/'+second.id,'DELETE')).status,200);
 saved=(await call()).data.find(g=>g.id==='legacy');assert.equal(saved.group_id,null);assert.equal(saved.redeemed,1);assert.deepEqual(saved.days,['2026-01-01']);
 assert.equal((await call('/'+g.id,'DELETE')).status,200);assert.equal((await call('/groups')).data.length,1,'Deleting a dream preserves its group');
 console.log('PASS: Big Dream create/rename/move/unassign/delete, membership persistence, atomic validation, owner isolation, legacy migration and preserved history/rewards.');
}finally{rmSync(dir,{recursive:true,force:true})}
