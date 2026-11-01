import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin=process.env.TINY_COMPLETION_URL||'http://localhost:4177';
const target=await (await fetch('http://127.0.0.1:9226/json/new?'+origin,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function pointer(type,x,y){await cdp('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1})}
try{
 await cdp('Page.enable');await cdp('Page.bringToFront');
 for(const width of [390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js("showDemo();window.backgroundClicks=0;document.querySelector('#settingsButton').addEventListener('click',()=>window.backgroundClicks++)");
  assert.deepEqual(await js("[...document.querySelectorAll('.tab')].map(b=>b.dataset.view)"),['dreams','calendar','shelf','analytics']);
  await js("document.querySelector('[data-view=analytics]').click()");
  assert.equal(await js('state.view'),'dreams');
  assert.equal(await js("document.querySelector('[data-view=analytics]').disabled"),true);
  assert.equal(await js("document.querySelector('[data-view=analytics] svg')!==null"),true);
  await js("document.querySelector('[data-view=shelf]').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.equal(await js("document.activeElement.dataset.view"),'dreams','Keyboard skips disabled analysis');
  for(const id of ['goalDialog','progressDialog','groupDialog','settingsDialog','confirmDialog','calendarDayDialog','incompleteDialog','incompleteReviewDialog']){
   await js(`window.scrollTo(0,200);document.querySelector('#${id}').showModal()`);
   await wait("getComputedStyle(document.body).position==='fixed'");
   const rect=await js(`document.querySelector('#${id}').getBoundingClientRect().toJSON()`);
   await pointer('mousePressed',rect.left+8,rect.top+8);await pointer('mouseReleased',rect.left+8,rect.top+8);
   assert.equal(await js(`document.querySelector('#${id}').open`),true,'Inside padding stays open');
   await pointer('mousePressed',rect.left+8,rect.top+8);await pointer('mouseReleased',2,2);
   assert.equal(await js(`document.querySelector('#${id}').open`),true,'Drag from inside stays open');
   await pointer('mousePressed',2,2);await pointer('mouseReleased',2,2);
   await wait(`!document.querySelector('#${id}').open`);
   await wait("getComputedStyle(document.body).position!=='fixed'");
  }
  assert.equal(await js('window.backgroundClicks'),0,'No click passes through the dialog');
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-navigation-${width}.png`,Buffer.from(shot.data,'base64'));
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 }
 console.log('PASS: menu order, disabled analysis, keyboard navigation, outside dismissal for eight dialogs, inside/drag protection, scroll unlock and background click isolation. Demo only.');
}finally{await cdp('Page.close');ws.close()}
