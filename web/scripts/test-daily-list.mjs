import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {api} from '../worker/api.js';
import {localDB} from './sqlite.mjs';
import {complete,progress} from '../shared/planner.js';
const dir=mkdtempSync(join(tmpdir(),'tiny-daily-list-')),DB=localDB(join(dir,'test.sqlite'));
async function call(path='',method='GET',body){const r=await api(new Request('https://test/api/goals'+path,{method,headers:{'oai-authenticated-user-id':'daily-list-test'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json()}}
const weekdays=[0,1,2,3,4,5,6],tasks=['fruta','salada','legume'].map(id=>({id,title:id,weekdays}));
const body={title:'Lista diária de teste',reward:'',target:10,color:'lavender',plan:{kind:'habit',dailyList:true,start:'2026-01-01',end:'',weekdays,tasks,items:[],notes:'',unit:''}};
try{
 const created=await call('','POST',body);assert.equal(created.status,201);let g=created.data;assert.equal(g.plan.dailyList,true);
 for(const task of tasks)g=(await call('/'+g.id+'/entry','POST',{day:'2026-01-01',key:'2026-01-01:'+task.id,done:true})).data;
 assert.equal(progress(g),1);assert.equal(complete(g),false);assert.deepEqual(g.days,['2026-01-01']);assert.equal(g.entries.some(e=>e.day==='2026-01-02'),false);
 g=(await call('/'+g.id+'/entry','POST',{day:'2026-01-02',key:'2026-01-02:fruta',done:true})).data;assert.equal(progress(g),1);
 for(const task of tasks.slice(1))g=(await call('/'+g.id+'/entry','POST',{day:'2026-01-02',key:'2026-01-02:'+task.id,done:true})).data;
 assert.equal(progress(g),2);assert.equal(g.entries.length,6);
 g=(await call('/'+g.id+'/entry','POST',{day:'2026-01-02',key:'2026-01-02:salada',done:false})).data;assert.deepEqual(g.days,['2026-01-01']);assert.equal(g.entries.filter(e=>e.day==='2026-01-01').length,3);
 assert.equal((await call('','POST',{...body,plan:{...body.plan,tasks:[]}})).status,400);
 assert.equal((await call('','POST',{...body,plan:{...body.plan,kind:'list',items:tasks}})).status,400);
 assert.equal((await call('','POST',{...body,plan:{...body.plan,dailyList:'yes'}})).status,400);
 console.log('PASS: daily lists persist, complete one day at a time, have independent checks per date, preserve past days on undo, and reject invalid modes.');
}finally{rmSync(dir,{recursive:true,force:true})}
