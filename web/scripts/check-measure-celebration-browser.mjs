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
await js(`showDemo();milestoneMemory.clear();state.groups=[];state.goals=[{id:'water-counter',title:'beber mais água',target:30,color:'peach',reward:'',days:[],failures:[],entries:[],plan:{kind:'habit',start:'',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'medidas',dailyTarget:3,dailyCounter:true,tasks:[],items:[]}}];seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click()`);
assert.equal(await js("document.querySelector('[data-action=quick-repeat]').textContent.trim()"),'0/3');
assert.ok(await js("document.querySelector('[data-action=quick-repeat] svg')!==null"));
await js("document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js("document.querySelector('[data-action=quick-repeat]').textContent.trim()"),'1/3');
assert.equal(await js('dailyTotal(state.goals[0],today())'),1);assert.equal(await js('dayDone(state.goals[0],today())'),false);
assert.equal(await js("document.querySelector('#milestoneDialog').open"),true);
assert.equal(await js("document.querySelector('#milestone [data-scene]').dataset.scene"),'item');
assert.match(await js("document.querySelector('#milestone').textContent"),/1 de 3 medidas/);
const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/water-measure-celebration-${width}.png`,Buffer.from(png.data,'base64'));
await js("dismissMilestone();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js("document.querySelector('#milestone [data-scene]').dataset.scene"),'item');
assert.equal(await js("document.querySelector('[data-action=quick-repeat]').textContent.trim()"),'2/3');
await js("dismissMilestone();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js("document.querySelector('[data-action=quick-repeat]').textContent.trim()"),'desfazer · 3/3');
assert.equal(await js('dayDone(state.goals[0],today())'),true);assert.equal(await js("document.querySelector('#milestone [data-scene]').dataset.scene"),'day');
await js("dismissMilestone();document.querySelector('[data-action=quick-repeat]').click()");await wait('!state.busy');
assert.equal(await js('dailyTotal(state.goals[0],today())'),2);assert.equal(await js("document.querySelector('#milestoneDialog').open"),false);
await js("document.querySelector('#demoBanner').hidden=true;document.querySelector('.goal').scrollIntoView({block:'start'});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
const cardShot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/counter-label-${width}.png`,Buffer.from(cardShot.data,'base64'));
await js(`state.goals[0].id='water-quantity';state.goals[0].entries=[];state.goals[0].days=[];state.goals[0].plan={...planOf(state.goals[0]),dailyCounter:false,dailyTarget:2,unit:'litros'};render();openDetails('water-quantity',today());document.querySelector('#dailyValue').value='0.5';document.querySelector('#dailyAmountForm').requestSubmit()`);await wait('!state.busy');
assert.equal(await js("document.querySelector('#itemMilestone [data-scene]').dataset.scene"),'item');
assert.match(await js("document.querySelector('#itemMilestone').textContent"),/0,5 de 2 litros/);
await js("document.querySelector('[data-entry-key]').click()");await wait('!state.busy');
assert.equal(await js("document.querySelector('#itemMilestone')"),null);
assert.equal(await js('dailyTotal(state.goals[0],today())'),0);
await js("document.querySelector('#progressDialog').close()");
}
console.log('PASS: partial measures celebrate from card and dialog, full daily target keeps day scene, undo does not celebrate. Demo only.');ws.close();
