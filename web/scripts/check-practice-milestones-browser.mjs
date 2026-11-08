import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js(`showDemo();milestoneMemory.clear();state.groups=[];state.goals=[{id:'milestone-water-'+${width},title:'beber mais água',target:21,color:'peach',reward:'',days:Array.from({length:6},(_,i)=>dayBefore(6-i)),failures:[],entries:[],plan:{kind:'habit',completionMode:'streak',start:dayBefore(6),end:'',weekdays:[0,1,2,3,4,5,6],unit:'quenchers',dailyTarget:2,dailyCounter:true,tasks:[],items:[]}}];seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#demoBanner').hidden=true`);
 assert.equal(await js("document.querySelector('.pending-seal')"),null);
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"3\"] .practice-seal>span').textContent"),'3');
 assert.equal(await js("document.querySelector('.streak-caption').textContent.includes('próximo')"),false);
 assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
 await js("document.fonts.ready");
 const numberCenters=await js("[...document.querySelectorAll('.streak-square .seal-number')].map(e=>{const b=e.getBBox(),s=getComputedStyle(e);return{number:e.textContent,x:b.x+b.width/2,y:b.y+b.height/2,visible:s.display!=='none'}})");
 for(const center of numberCenters){assert.ok(center.visible);assert.ok(Math.abs(center.x-24)<.6&&Math.abs(center.y-24)<1.5,`Off-center milestone at ${width}px: ${JSON.stringify(center)}`)}

 assert.equal(await js("[...document.querySelectorAll('.streak-square')].findIndex(c=>c.classList.contains('current'))"),10);
 assert.equal(await js("document.querySelectorAll('[data-practice-future]').length"),3);
 assert.equal(await js("[...document.querySelectorAll('[data-practice-future]')].every(c=>!c.classList.contains('success')&&!c.querySelector('[data-action]'))"),true);
 assert.equal(await js("document.querySelector('.goal').getBoundingClientRect().height"),582);
 await js("document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
 assert.equal(await js("document.querySelector('.practice-achievement')"),null,'Partial quantity is not a day milestone');
 await js("dismissMilestone();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
 assert.equal(await js("document.querySelector('#milestoneDialog').open"),true);
 assert.equal(await js("document.querySelector('.practice-achievement .practice-seal>span').textContent"),'7');
assert.ok(await js("parseFloat(getComputedStyle(document.querySelector('.practice-achievement .practice-seal>span')).fontSize)<=28"),'Success numerals remain delicate');
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"7\"]').classList.contains('seal-conquered')"),true);
 assert.equal(await js("document.querySelectorAll('.streak-grid .practice-seal').length"),1);
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"3\"]')"),null,'Earlier milestones return to ordinary checks');

 await new Promise(r=>setTimeout(r,1000));
 await writeFile(`/tmp/practice-milestone-celebration-${width}.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await js("dismissMilestone();document.querySelector('#demoBanner').hidden=true;document.querySelector('#mobileDreams')?.scrollTo(0,0)");
 const cardClip=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()");
 await writeFile(`/tmp/practice-milestone-card-${width}.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:cardClip,captureBeyondViewport:true})).data,'base64'));
 await js("document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
 assert.equal(await js("document.querySelector('#milestoneDialog').open"),false,'Undo dismisses the milestone');
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"7\"]')"),null);
 await js("document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
 assert.equal(await js("document.querySelector('#milestoneDialog').open"),false,'Redo does not replay acknowledged milestone');
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
}
// Schedule-aware streaks and accumulated days assign badges to the correct practice dates.
assert.deepEqual(await js(`(()=>{const g={target:21,days:['2026-11-02','2026-11-03','2026-11-05'],failures:[],plan:{kind:'habit',completionMode:'streak',weekdays:[1,2,3,4,5,6],skippedDays:['2026-11-04']}};return [...practiceMilestoneDays(g)]})()`),[['2026-11-05',3]]);
assert.deepEqual(await js(`(()=>{const g={target:6,days:['2026-11-02','2026-11-04','2026-11-05'],failures:[],plan:{kind:'habit',completionMode:'total',weekdays:[0,1,2,3,4,5,6]}};return [...practiceMilestoneDays(g)]})()`),[['2026-11-05',3]]);
assert.deepEqual(await js(`(()=>{const g={target:21,days:['2026-11-02','2026-11-04','2026-11-05'],failures:['2026-11-03'],plan:{kind:'habit',completionMode:'streak',weekdays:[0,1,2,3,4,5,6]}};return [...practiceMilestoneDays(g)]})()`),[]);
// Archived dreams end at their deadline, never project practice beyond it.
assert.equal(await js(`(()=>{const p={...planOf({}),kind:'habit',completionMode:'period',start:dayBefore(25),end:dayBefore(5),incompleteAccepted:true},g={id:'archived-window',target:21,days:[dayBefore(20)],failures:[],entries:[],plan:p},host=document.createElement('div');host.innerHTML=habitStreakGrid(g);return host.querySelectorAll('[data-practice-future]').length===0&&host.querySelector('.streak-grid').lastElementChild.dataset.practiceDay===p.end})()`),true);
// Final milestones retain the themed badge and delicate stitched seal.
await js("dismissMilestone();state.goals[0].id='final-seven';state.goals[0].target=7;state.goals[0].days=state.goals[0].days.filter(d=>d!==today());state.goals[0].entries=[];state.goals[0].plan.dailyTarget=1;milestoneMemory.clear();seedMilestones();render();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js("document.querySelector('#milestone').classList.contains('final-chapter')"),true);
assert.equal(await js("document.querySelector('.practice-achievement .practice-seal>span').textContent"),'7');
await new Promise(r=>setTimeout(r,1000));
await writeFile('/tmp/practice-milestone-final.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
await js('dismissMilestone();state.goals[0].target=21');
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await js("state.goals[0].id='reduced-seal';milestoneMemory.clear();state.goals[0].days=state.goals[0].days.filter(d=>d!==today());state.goals[0].entries=[];state.goals[0].plan.dailyTarget=1;seedMilestones();render();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js("getComputedStyle(document.querySelector('.practice-achievement')).animationName"),'none');
console.log('PASS: double-ring milestones, measured completion, undo/redo, schedules, accumulated days, failure, reduced motion and fixed cards at all required widths.');ws.close();
