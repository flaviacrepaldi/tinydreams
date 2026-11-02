import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");
await js(`showDemo();state.goals=[{id:'clock-qa',title:'Meu combinado',target:30,color:'sage',reward:'Uma pausa',days:[],failures:[],entries:[],created_at:new Date().toISOString(),plan:{kind:'habit',impulse:true,start:dayBefore(2),end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',support:'Respirar e cuidar de mim',tasks:[],items:[],impulseStartedAt:new Date(Date.now()-183845000).toISOString()}}];render()`);
assert.match(await js("document.querySelector('[data-impulse-clock]').textContent"),/^2dias03h 04m \d\ds$/);
assert.equal(await js("document.querySelectorAll('.impulse-streak .success').length"),2);
const before=await js("document.querySelector('[data-impulse-clock]').textContent");await wait(`document.querySelector('[data-impulse-clock]').textContent!==${JSON.stringify(before)}`);
assert.equal(await js("document.querySelector('[data-action=quick-outcome][data-status=success]')"),null);
for(const width of [390,1440]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await js("document.querySelector('[data-goal]').scrollIntoView({block:'center'})");
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 if(width<600){
  assert.equal(await js("getComputedStyle(document.querySelector('.overview-desktop-title')).display"),'none');
  assert.ok(await js("document.querySelector('.overview-mobile-brand svg path')!==null"));
  assert.equal(await js("document.querySelector('.streak-square').getBoundingClientRect().height"),22);
  assert.ok(await js("document.querySelector('.streak-square').getBoundingClientRect().width>30"));
 }

 assert.equal(await js("parseFloat(getComputedStyle(document.querySelector('.impulse-days')).fontSize)>parseFloat(getComputedStyle(document.querySelector('.impulse-hours')).fontSize)*2"),true);
 assert.equal(await js("(()=>{const e=document.querySelector('[data-impulse-clock]');return e.scrollWidth>e.clientWidth&&e.clientWidth>0})()"),false);
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/impulse-timer-${width}.png`,Buffer.from(png.data,'base64'));
}
await js("document.querySelector('[data-action=impulse-relapse]').click()");await wait("impulseElapsed(state.goals[0]).seconds<3");assert.equal(await js('progress(state.goals[0])'),0);assert.equal(await js("document.querySelectorAll('.impulse-streak .success').length"),0);
await js("openDetails('clock-qa',today())");assert.equal(await js("document.querySelector('#urgeForm')"),null);
await js("document.querySelector('[data-outcome=clear]').click()");await wait('progress(state.goals[0])===2');
await js("document.querySelector('#progressDialog').close();openForm('clock-qa')");assert.ok(await js("document.querySelector('#impulseStartTime').value"));
assert.equal(await js('formPlan().impulseStartedAt===state.goals[0].plan.impulseStartedAt'),true);
await js("document.querySelector('#goalDialog').close();state.goals[0].plan.impulseStartedAt=new Date(Date.now()-86399000).toISOString();render()");
assert.equal(await js("document.querySelectorAll('.impulse-streak .success').length"),0);
await wait("document.querySelectorAll('.impulse-streak .success').length===1");
console.log('PASS: live seconds, mobile/desktop layout, no success button, relapse/reset/undo and exact start preservation on edit. Demo only.');ws.close();
