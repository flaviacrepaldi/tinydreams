import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin=process.env.TINY_COMPLETION_URL||'http://localhost:4177';
const target=await (await fetch('http://127.0.0.1:9226/json/new?'+origin,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
try{
 await cdp('Page.enable');await cdp('Page.bringToFront');
 for(const width of [390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js(`showDemo();state.goals=Array.from({length:3},(_,i)=>({id:'counter-'+i,title:i===1?'beber mais água':'repetições '+i,target:21,color:'peach',days:[],entries:[],failures:[],reward:'',plan:{...planOf({}),start:dayBefore(2),dailyCounter:true,dailyTarget:2,unit:i===1?'quenchers':'vezes'}}));render();document.querySelector('[data-goal=counter-1]').scrollIntoView({inline:'center',block:'center'})`);
  await new Promise(r=>setTimeout(r,250));
  await js("document.querySelector('[data-id=counter-1][data-action=quick-repeat]').click()");await wait('!state.busy');
  assert.equal(await js("dailyTotal(state.goals[1],today())"),1);
  assert.equal(await js("document.querySelector('#progressDialog').open"),false,'First repetition stays on home');
  assert.equal(await js("state.goals[1].days.includes(today())"),false);
  assert.equal(await js("document.querySelector('#milestoneDialog').open"),false);
  if(width<600)assert.ok(await js("{const r=document.querySelector('[data-goal=counter-1]').getBoundingClientRect();Math.abs(r.left+r.width/2-innerWidth/2)<20}"));
  await js("document.querySelector('[data-id=counter-1][data-action=quick-repeat]').click()");await wait('!state.busy');
  assert.equal(await js("dailyTotal(state.goals[1],today())"),2);
  assert.equal(await js("state.goals[1].days.includes(today())"),true);
  assert.equal(await js("document.querySelector('#progressDialog').open"),false,'Completion does not open history');
  await js("dismissMilestone();document.querySelector('[data-id=counter-1][data-action=quick-repeat]').click()");await wait('!state.busy');
  assert.equal(await js("dailyTotal(state.goals[1],today())"),1,'Undo removes exactly one repetition');
  assert.equal(await js("state.goals[1].days.includes(today())"),false);
  assert.equal(await js("document.querySelector('#progressDialog').open"),false);
  assert.equal(await js("dailyTotal(state.goals[0],today())+dailyTotal(state.goals[2],today())"),0);
  await js("document.querySelector('[data-id=counter-1].diary-button').click()");
  assert.equal(await js("document.querySelector('#progressDialog').open"),true,'Notebook still opens history');
  await js("document.querySelector('#progressDialog').close()");
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-quick-counter-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 console.log('PASS: direct home repetition, threshold completion, no history modal, undo, counter isolation, retained mobile card and notebook access. Demo only.');
}finally{await cdp('Page.close');ws.close()}
