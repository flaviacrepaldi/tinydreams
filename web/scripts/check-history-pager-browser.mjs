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
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
  await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js(`showDemo();state.goals=[{id:'history-test',title:'histórico de teste',target:21,color:'peach',days:[],entries:[],failures:[],reward:'',plan:{...planOf({}),start:dayBefore(10)}}];render();openDetails('history-test',dayBefore(1))`);
  await wait("document.querySelector('#historyPager').scrollLeft>0");
  assert.equal(await js("document.querySelector('.history-days').scrollWidth>document.querySelector('.history-days').clientWidth"),true);
  assert.equal(await js("getComputedStyle(document.querySelector('.history-days')).scrollbarWidth"),'none');
  await js(`document.querySelector('#dayNote').value='rascunho preservado';document.querySelector('#historyPager').scrollTo({left:0,behavior:'smooth'})`);
  await wait("document.querySelector('#routineDay').value===dayBefore(2)");
  await js(`document.querySelector('[data-history-day="'+dayBefore(1)+'"]').click()`);
  await wait("document.querySelector('#routineDay').value===dayBefore(1)");
  assert.equal(await js("document.querySelector('#dayNote').value"),'rascunho preservado');
  await new Promise(r=>setTimeout(r,250));
  await js(`{const tabs=document.querySelector('.history-days'),tab=tabs.querySelector('[data-history-day="'+dayBefore(4)+'"]');tabs.scrollTo({left:tab.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-tab.offsetWidth)/2,behavior:'smooth'})}`);
  await wait("document.querySelector('#routineDay').value===dayBefore(4)");
  assert.equal(await js("document.querySelector('.history-day[aria-selected=true]').dataset.historyDay===document.querySelector('#routineDay').value"),true);
  await js(`selectHistoryDay(today())`);await new Promise(r=>setTimeout(r,350));
  assert.equal(await js("document.querySelector('#historyPager').children.length"),2);
  assert.equal(await js("document.querySelector('#routineDay').value===today()"),true);
  assert.equal(await js("[...document.querySelectorAll('[id]')].map(el=>el.id).length===new Set([...document.querySelectorAll('[id]')].map(el=>el.id)).size"),true);
  assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
  if(width===390){
   await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});
   const point=await js("({x:document.querySelector('#historyPager').getBoundingClientRect().left+50,y:document.querySelector('#historyPager').getBoundingClientRect().top+80})");
   await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   for(let n=1;n<=8;n++){
    await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+n*25,y:point.y}]});
    await new Promise(r=>setTimeout(r,25));
   }
   await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await wait("document.querySelector('#routineDay').value===dayBefore(1)");
   await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
  }
  for(const mode of ['counter','tasks','impulse']){
   await js(`{const g=state.goals[0];g.plan={...planOf(g),dailyTarget:${mode==='counter'?3:'null'},dailyCounter:${mode==='counter'},unit:'copos',impulse:${mode==='impulse'},tasks:${mode==='tasks'?"[{id:'task',title:'tarefa de teste',weekdays:[0,1,2,3,4,5,6]}]":"[]"}};openDetails(g.id,dayBefore(1))}`);
   await new Promise(r=>setTimeout(r,200));
   await js("document.querySelector('#historyPager').scrollTo({left:0,behavior:'instant'})");
   await wait("document.querySelector('#routineDay').value===dayBefore(2)");
   assert.equal(await js("document.querySelector('#routineChecks [data-outcome=success]')!==null"),true);
  }
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-history-pager-${width}.png`,Buffer.from(shot.data,'base64'));
  await js("document.querySelector('#progressDialog').close()");
 }
 console.log('PASS: form paging, centered date selection, clickable tabs, draft preservation, today boundary, unique IDs and mobile/desktop bounds. Demo only.');
}finally{await cdp('Page.close');ws.close()}
