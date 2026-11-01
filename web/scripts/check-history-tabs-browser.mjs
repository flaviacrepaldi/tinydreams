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
 await cdp('Page.enable');
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:width<600,maxTouchPoints:1});
  await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js(`showDemo();state.goals=[{id:'tabs-test',title:'meu histórico',target:200,color:'peach',days:[],entries:[],failures:[],reward:'',plan:{...planOf({}),start:dayBefore(100),dailyTarget:2,dailyCounter:true,unit:'copos',dayNotes:{[dayBefore(2)]:'anotação guardada'}}}];render();document.querySelector('.diary-button').click()`);
  await wait("document.body.style.position==='fixed'");
  assert.equal(await js("document.querySelector('#routineDay').value===dayBefore(1)"),true,'Notebook opens yesterday');
  assert.equal(await js("document.querySelector('[role=tab][aria-selected=true]').dataset.historyDay===dayBefore(1)"),true);
  assert.equal(await js("document.querySelector('.history-days').scrollWidth>document.querySelector('.history-days').clientWidth"),true,'Date tabs scroll inside dialog');
  await js("document.querySelector('#dayNote').value='rascunho de ontem';document.getElementById('history-tab-'+dayBefore(2)).click()");
  assert.equal(await js("document.querySelector('#dayNote').value"),'anotação guardada');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
  assert.equal(await js("document.querySelector('#dayNote').value"),'rascunho de ontem','Switching tabs retains unsaved writing');
  assert.equal(await js("document.activeElement.dataset.historyDay===dayBefore(1)"),true,'Keyboard keeps focus on selected tab');
  await js("document.querySelector('[data-pick-history-date]').click();const input=document.querySelector('#routineDay');input.value=dayBefore(80);input.dispatchEvent(new Event('change',{bubbles:true}))");
  await wait("document.querySelector('#routineDay').value===dayBefore(80)");
  assert.equal(await js("document.querySelector('[role=tab][aria-selected=true]').dataset.historyDay===dayBefore(80)"),true,'Picker selects matching tab');
  await js("selectHistoryDay(dayBefore(1),true)");await new Promise(r=>setTimeout(r,150));
  await js("document.querySelector('.history-days').scrollLeft=0");
  await wait("document.querySelector('.history-days').firstElementChild.dataset.historyDay<dayBefore(31)");
  await js("selectHistoryDay(dayBefore(1),true)");await new Promise(r=>setTimeout(r,200));
  if(width<600){
   const box=await js("(()=>{const b=document.querySelector('.history-days').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width}})()");
   const before=await js("document.querySelector('.history-days').scrollLeft");
   await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+50,y:box.y+35}]});
   for(let i=1;i<=6;i++)await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+50+i*20,y:box.y+35}]});
   await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await wait(`document.querySelector('.history-days').scrollLeft<${before}-20`);
   assert.equal(await js("document.body.style.position"),'fixed','Swiping tabs keeps background locked');
  }
  await js("selectHistoryDay(dayBefore(1),true);document.querySelector('#routineDay').hidden=true");await new Promise(r=>setTimeout(r,200));
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-history-tabs-${width}.png`,Buffer.from(shot.data,'base64'));
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  await js("document.querySelector('#progressDialog').close();document.querySelector('.quick-outcomes [data-action=details]').click()");
  assert.equal(await js("document.querySelector('#routineDay').value===today()"),true,'Home progress still opens today');
  await js("document.querySelector('#progressDialog').close();state.goals[0].plan.start=today();render();document.querySelector('.diary-button').click()");
  assert.equal(await js("document.querySelector('#routineDay').value===today()&&document.querySelectorAll('[role=tab]').length===1"),true,'A new dream cannot open a date before its start');
 }
 console.log('PASS: yesterday default, horizontal date tabs, native mobile swipe, keyboard navigation, date-picker sync, retained drafts, date limits, home-today actions, and mobile/desktop overflow.');
}finally{await cdp('Page.close');ws.close()}
