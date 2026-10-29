import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {api} from '../worker/api.js';
import {localDB} from './sqlite.mjs';
import {planOf,validatePlan,progress,targetOf,complete,habitSequence,habitCompletionDay} from '../shared/planner.js';
const base={title:'Aeróbico',reward:'Um livro',target:3,color:'sage',days:[],entries:[],failures:[],plan:{...planOf({}),completionMode:'total'}};
const g={...base,days:['2026-01-01','2026-01-03','2026-01-05'],failures:['2026-01-02']};
assert.equal(progress(g),3);assert.equal(complete(g),true);
assert.equal(targetOf({...g,plan:{...g.plan,start:'2026-01-01'}}),3);
const streak={...g,plan:{...g.plan,completionMode:'streak'}};
assert.equal(complete(streak),false);
assert.equal(habitSequence(streak,'2026-01-05').current,1);
streak.days=['2026-01-01','2026-01-02','2026-01-03'];streak.failures=['2026-01-04'];
assert.equal(complete(streak),true,'A later failure preserves a completed challenge');
assert.equal(habitCompletionDay(streak),'2026-01-03');
streak.days=['2026-01-01','2026-01-03'];assert.equal(complete(streak),false,'Undoing an essential day revokes completion');
const mwf={...base,plan:{...base.plan,completionMode:'streak',weekdays:[1,3,5]},days:['2026-01-05','2026-01-07','2026-01-09']};
assert.equal(habitCompletionDay(mwf),'2026-01-09');
assert.equal(habitSequence({...mwf,target:21},'2026-01-11').current,3,'Rest days preserve a sequence');
assert.equal(habitSequence({...mwf,target:21},'2026-01-12').current,3,'Today can still be completed');
assert.equal(habitSequence({...mwf,target:21},'2026-01-13').current,0,'Unrecorded past practice interrupts the sequence');
assert.equal(habitSequence({...mwf,target:21,failures:['2026-01-12']},'2026-01-12').current,0);
const period={...base,plan:{...base.plan,completionMode:'period',start:'2026-01-01',end:'2026-01-07'}};
assert.equal(targetOf(period),7);assert.equal(complete({...period,days:['2026-01-01']}),false);
assert.equal(targetOf({...period,plan:{...period.plan,end:'2026-01-08'}}),8);
assert.equal(progress({...g,plan:{...g.plan,start:'2026-02-01'}}),0,'Old history before a rescheduled start is retained but excluded');
for(const p of [{...base.plan,completionMode:'bad'},{...base.plan,completionMode:'period'},{...base.plan,end:'2026-01-01'}])assert.throws(()=>validatePlan(p));
const legacy={...period,plan:{...period.plan}};delete legacy.plan.completionMode;assert.equal(targetOf(legacy),7);
const dir=mkdtempSync(join(tmpdir(),'tiny-completion-')),DB=localDB(join(dir,'test.sqlite'));
async function call(path='',method='GET',body){const r=await api(new Request('https://test/api/goals'+path,{method,headers:{'oai-authenticated-user-id':'completion'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json()}}
try{
 for(const dailyList of [false,true]){
  const plan={...base.plan,completionMode:'streak',dailyList,tasks:dailyList?[{id:'exercise',title:'Aeróbico',weekdays:base.plan.weekdays}]:[]};
  const created=await call('','POST',{...base,plan});assert.equal(created.status,201);
  const id=created.data.id;
  async function success(day){return dailyList?call('/'+id+'/entry','POST',{key:day+':exercise',day,done:true}):call('/'+id+'/outcome','POST',{day,status:'success'})}
  await success('2026-01-01');await success('2026-01-03');let r=await success('2026-01-04');assert.equal(complete(r.data),false);
  r=await success('2026-01-05');assert.equal(complete(r.data),true);assert.equal(habitCompletionDay(r.data),'2026-01-05');
  await call('/'+id+'/outcome','POST',{day:'2026-01-06',status:'failure'});
  assert.equal((await call('/'+id+'/redeem','POST',{})).status,200);
  r=await call('/'+id+'/outcome','POST',{day:'2026-01-04',status:null});assert.equal(complete(r.data),false);assert.equal(r.data.redeemed,0);assert.equal((await DB.prepare('SELECT redeemed FROM goals WHERE id=?').bind(id).all()).results[0].redeemed,0);
  const updated=await call('/'+id,'PATCH',{...base,plan:{...plan,completionMode:'total'}});assert.equal(updated.status,200);assert.equal(complete(updated.data),true);
 }
 console.log('PASS: total/streak/period completion, schedule gaps, corrections, future starts, legacy plans, rewards and daily lists.');
}finally{rmSync(dir,{recursive:true,force:true})}
