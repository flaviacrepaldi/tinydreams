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
 await js(`showDemo();state.groups=[];state.goals=[{id:'finish',title:'não aumentar minhas faturas',target:6,color:'sage',reward:'comprar um creme de mãos novo',days:[5,4,3,2,1].map(dayBefore),failures:[],entries:[],plan:{...planOf({}),completionMode:'streak',start:dayBefore(5)}}];seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#demoBanner').hidden=true`);
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('today()'));
 assert.equal(await js("document.querySelector('.target-finish-number').textContent"),'6');
 assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1,'Final day has visible rays');
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),3);
 assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
 assert.equal(await js("document.querySelector('.goal').getBoundingClientRect().height"),582);
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
 await js('document.fonts.ready');
 const box=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
 await writeFile('/tmp/streak-finish-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:box,captureBeyondViewport:true})).data,'base64'));
 await js("state.goals[0].failures=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish')"),null,'Failure resets consecutive-day projection');
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),0);
 await js("state.goals[0].failures=[];state.goals[0].plan.skippedDays=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('dayBefore(-1)'),'Skipped date does not consume remaining practice');
 await js("state.goals[0].plan.skippedDays=[];state.goals[0].days.push(today());render()");
 assert.equal(await js("document.querySelector('.target-finish')"),null);
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"6\"] .practice-seal')!==null"),true);
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),3);
 assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1,'Earned final seal keeps its rays');
 await js("state.goals[0].days.pop();state.goals[0].plan.completionMode='total';render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('today()'));
 await js("state.goals[0].failures=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('dayBefore(-1)'),'Recorded failure moves the accumulated goal finish to the next scheduled day');
}
console.log('PASS: 5/6 finish, failure reset, skip, completion, accumulated days and fixed card at four widths');
ws.close();
