import assert from 'node:assert/strict';
import {runPool} from './ui-check-pool.mjs';
let active=0,maximum=0;const seen=[];
await runPool([0,1,2,3,4,5],3,async(job,worker)=>{
 active++;maximum=Math.max(maximum,active);seen.push([job,worker]);
 await new Promise(r=>setTimeout(r,5));active--;
});
assert.equal(maximum,3);assert.equal(active,0);
assert.deepEqual(seen.map(([job])=>job).sort(),[0,1,2,3,4,5]);
let finished=false;const started=[];
await assert.rejects(runPool([0,1,2,3],2,async job=>{
 started.push(job);
 if(job===0)throw Error('layout regression');
 await new Promise(r=>setTimeout(r,10));finished=true;
}),/layout regression/);
assert.deepEqual(started,[0,1]);assert.equal(finished,true);
await runPool([],3,()=>assert.fail('Empty pool started a job'));
console.log('PASS: UI pool runs every job once, bounds concurrency and propagates failure after running jobs settle.');

const {uiCheckPlan,themeShard}=await import('./ui-check-plan.mjs');
const editions=Array.from({length:12},(_,i)=>i);
for(const workers of [1,2,3,4,5,6]){
 const plan=uiCheckPlan({cpus:12,memory:16*1024**3,workers:String(workers),editions:12});
 assert.equal(plan.workers,workers);assert.equal(plan.jobs[0].name,'rewards');
 const themes=plan.jobs.filter(job=>job.env);
 assert.deepEqual(themes.flatMap(job=>themeShard(editions,job.env.TINY_QA_THEME_SHARD,job.env.TINY_QA_THEME_SHARDS)),editions,'Every edition runs exactly once at each concurrency');
 assert.equal(new Set(plan.jobs.map(job=>job.script)).size,12,'All browser suites stay in the gate');
 assert.ok(Math.max(...themes.map(job=>themeShard(editions,job.env.TINY_QA_THEME_SHARD,job.env.TINY_QA_THEME_SHARDS).length))-Math.min(...themes.map(job=>themeShard(editions,job.env.TINY_QA_THEME_SHARD,job.env.TINY_QA_THEME_SHARDS).length))<=1,'Balanced shards');
}
for(const workers of ['',0,7,'NaN','2.5'])assert.throws(()=>uiCheckPlan({workers,editions:12}),/TINY_QA_WORKERS/);
assert.equal(uiCheckPlan({cpus:12,memory:16*1024**3,editions:12}).workers,6);
assert.equal(uiCheckPlan({cpus:2,memory:16*1024**3,editions:12}).workers,1);
assert.equal(uiCheckPlan({cpus:12,memory:3*1024**3,editions:12}).workers,1);
assert.deepEqual(themeShard(editions,undefined),editions);
assert.deepEqual(themeShard(editions,'1'),[4,5,6,7],'Legacy three-shard invocation');
for(const [index,count] of [['-1',3],['1.5',3],['3',3],['x',3],['0',0],['0',13]])assert.throws(()=>themeShard(editions,index,count),/Invalid theme shard/);
console.log('PASS: resource-aware concurrency, complete browser coverage, balanced theme partitions and invalid configuration rejection.');

for(const workers of [1,2,3,6]){
 const smoke=uiCheckPlan({cpus:12,memory:16*1024**3,workers,editions:12,mode:'smoke'});
 assert.equal(smoke.workers,Math.min(workers,3));assert.equal(smoke.shards,0);
 assert.deepEqual(smoke.jobs.map(job=>job.name),['streak-alignment','analytics','edit-dialog']);
}
assert.throws(()=>uiCheckPlan({cpus:12,memory:16*1024**3,editions:12,mode:'skip'}),/Invalid UI check mode/);
console.log('PASS: quick gate retains mixed cards, carousel gestures, analytics and dialogs; unknown modes cannot bypass checks.');
