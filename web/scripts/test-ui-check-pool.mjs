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
