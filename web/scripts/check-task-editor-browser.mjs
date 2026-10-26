import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function screenshot(name,width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await js("document.querySelector('#goalDialog').scrollTop=document.querySelector('#taskFields').offsetTop-30");await new Promise(r=>setTimeout(r,300));const m=await cdp('Page.getLayoutMetrics');const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});await writeFile(new URL('../../.impeccable/review/task-editor-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));const overflow=await js('document.documentElement.scrollWidth>innerWidth');if(overflow)throw Error('Horizontal overflow at '+width)}



await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");await js('showDemo()');await click('#newGoalButton');await js("document.querySelector('#goalTarget').value=21");
if(!await js("document.querySelector('#taskFields').hidden"))throw Error('Tasks should be hidden for simple check');
await js("document.querySelector('#goalTitle').value='Rotina personalizada';document.querySelector('#habitMeasure').value='tasks';syncKind()");
await click('#addRoutine');await js("document.querySelector('.routine-row .row-title').value='Primeira tarefa';document.querySelector('.routine-row .row-title').dispatchEvent(new Event('input',{bubbles:true}))");await click('.finish-task');
await click('#addRoutine');await js("document.querySelector('.routine-row:last-child .row-title').value='Segunda tarefa';document.querySelector('.routine-row:last-child .row-title').dispatchEvent(new Event('input',{bubbles:true}));document.querySelectorAll('.routine-row:last-child input[type=checkbox]')[1].click()");
if(!await js("document.querySelectorAll('.routine-row[open]').length===1"))throw Error('Editor not compact');
await js("document.querySelector('#taskFields').scrollIntoView({block:'start'})");await screenshot('mobile',390,844);await screenshot('desktop',1440,1000);
await click('.routine-row:last-child .finish-task');
await js("document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");
const goalId=await js('state.goals.at(-1).id');await click(`[data-action=edit][data-id="${goalId}"]`);
if(!await js("document.querySelector('#habitMeasure').value==='tasks' && document.querySelectorAll('.routine-row').length===2"))throw Error('Task edit lost configuration');
await js("document.querySelector('#habitMeasure').value='quantity';syncKind();document.querySelector('#goalDailyTarget').value=2;document.querySelector('#goalDailyUnit').value='litros'");
if(!await js("formPlan().tasks.length===0 && document.querySelector('#taskFields').hidden"))throw Error('Hidden tasks still submitted');
await js("document.querySelector('#habitMeasure').value='check';syncKind()");if(!await js("formPlan().tasks.length===0 && document.querySelector('#dailyQuantityFields').hidden"))throw Error('Simple mode not isolated');
await js("document.querySelector('#habitMeasure').value='tasks';syncKind()");await click('.routine-row:last-child .remove-row');
if(!await js("document.querySelector('#taskCount').textContent==='1 tarefa'"))throw Error('Wrong task count');
console.log('PASS: distinct completion modes, compact accordion, task days, mobile/desktop overflow, save/reopen, mode isolation, remove/count.');ws.close();
