import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {impulseElapsed,progress,habitCompletionDay,outcomeOf,practiceToday} from '../shared/planner.js';
import {api} from '../worker/api.js';
import {localDB} from './sqlite.mjs';
const plan={kind:'habit',impulse:true,start:'2026-01-01',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};
const g={plan,target:2,days:[],entries:[],failures:[],created_at:'2026-01-05T15:00:00Z'};
assert.equal(impulseElapsed(g,Date.parse('2026-01-02T04:02:03Z')).seconds,90123);
assert.equal(outcomeOf(g,'2026-01-01','2026-01-03'),null,'Missing check-ins are not failures');
assert.equal(impulseElapsed({...g,plan:{...plan,impulseStartedAt:'2026-01-02T04:02:03Z'}},Date.parse('2026-01-02T04:02:04Z')).seconds,1);
assert.equal(impulseElapsed({...g,plan:{...plan,start:'2099-01-01'}},Date.parse('2026-01-01T00:00:00Z')).seconds,0);
assert.equal(impulseElapsed({...g,failures:['2026-01-02'],plan:{...plan,impulseResets:{'2026-01-02':'2026-01-02T18:30:00Z'}}},Date.parse('2026-01-02T18:30:07Z')).seconds,7);
assert.equal(impulseElapsed({...g,failures:['2026-01-02']},Date.parse('2026-01-03T03:00:00Z')).seconds,86400);
assert.equal(impulseElapsed({...g,plan:{...plan,start:''}},Date.parse('2026-01-05T15:00:10Z')).seconds,10);
const dir=mkdtempSync(join(tmpdir(),'tiny-timer-')),DB=localDB(join(dir,'test.sqlite'));
async function call(path,method,body){const r=await api(new Request('https://test/api/goals'+path,{method,headers:{'oai-authenticated-user-id':'timer'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json()}}
try{
 const startedAt=new Date(Date.now()-2*86400000-10000).toISOString();
 let r=await call('','POST',{title:'Timer',target:2,reward:'Pausa',color:'sage',plan:{...plan,start:'',impulseStartedAt:startedAt}});
 assert.equal(r.status,201);const id=r.data.id;
 assert.equal(progress(r.data),2);assert.ok(habitCompletionDay(r.data));
 r=await call('/'+id+'/outcome','POST',{day:practiceToday(),status:'failure',restart:true});
 assert.equal(r.status,200);assert.equal(progress(r.data),0);assert.ok(impulseElapsed(r.data).seconds<3);
 const first=r.data.plan.impulseResets[practiceToday()];
 r=await call('/'+id+'/outcome','POST',{day:practiceToday(),status:'failure',note:'Contexto'});
 assert.equal(r.data.plan.impulseResets[practiceToday()],first,'Saving a note must not restart the clock');
 const old=new Date(Date.now()-60000).toISOString();
 await DB.prepare('UPDATE goals SET plan=? WHERE id=?').bind(JSON.stringify({...r.data.plan,impulseResets:{[practiceToday()]:old}}),id).run();
 r=await call('/'+id+'/outcome','POST',{day:practiceToday(),status:'failure',restart:true});
 assert.ok(impulseElapsed(r.data).seconds<3,'Another relapse today restarts the clock');
 r=await call('','GET');r.data=r.data.find(g=>g.id===id);assert.equal(r.data.plan.impulseStartedAt,startedAt);assert.ok(impulseElapsed(r.data).seconds<3);
 r=await call('/'+id+'/outcome','POST',{day:practiceToday(),status:null});
 assert.equal(progress(r.data),2,'Undo restores the original sequence');
 assert.equal((await call('','POST',{title:'Invalid',target:2,reward:'',color:'sage',plan:{...plan,impulseStartedAt:'invalid'}})).status,400);
 console.log('PASS: impulse clock precision, legacy timestamps, future starts, automatic days, persisted resets, repeated relapse, notes and undo.');
}finally{rmSync(dir,{recursive:true,force:true})}
