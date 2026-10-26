import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function screenshot(name,width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await new Promise(r=>setTimeout(r,300));const m=await cdp('Page.getLayoutMetrics');const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(m.cssContentSize.height),scale:1}});await writeFile(new URL('../../.impeccable/review/quantity-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));const overflow=await js('document.documentElement.scrollWidth>innerWidth');if(overflow)throw Error('Horizontal overflow at '+width)}


await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");
await js('showDemo()');await click('#newGoalButton');await js("document.querySelector('#goalTarget').value=21");
await js("document.querySelector('#goalTitle').value='Quantidade diária';document.querySelector('#habitMeasure').value='quantity';syncKind();document.querySelector('#goalDailyTarget').value=2;document.querySelector('#goalDailyUnit').value='litros'");
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await js("document.querySelector('#dailyQuantityFields').scrollIntoView({block:'center'})");
await screenshot('form',390,844);
await js("document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");
const goalId=await js('state.goals.at(-1).id');await click(`[data-action=details][data-id="${goalId}"]`);
async function add(value){await js(`document.querySelector('#dailyValue').value=${value};document.querySelector('#dailyAmountForm').requestSubmit()`)}
await add(0.5);await wait(`dailyTotal(state.goals.find(g=>g.id==='${goalId}'),today())===0.5`);
if(await js(`state.goals.find(g=>g.id==='${goalId}').days.includes(today())`))throw Error('Premature daily completion');
await screenshot('partial',390,844);await add(1.5);await wait(`state.goals.find(g=>g.id==='${goalId}').days.includes(today())`);
await screenshot('complete',390,844);await click('[data-entry-key]');await wait(`!state.goals.find(g=>g.id==='${goalId}').days.includes(today())`);
await js("document.querySelector('#routineDay').value=dayBefore(1);renderRoutineChecks()");
if(!await js("document.querySelector('#routineChecks').textContent.includes('0 de 2 litros')"))throw Error('Day totals leaked');
await click('[data-close=progressDialog]');await click('[data-view=today]');await screenshot('today',390,844);
if(!await js("document.querySelector('#content').textContent.includes('litros hoje')"))throw Error('Missing today quantity');
console.log('PASS: daily quantity form, partial progress, automatic completion, undo, separate dates, Today view, mobile overflow.');ws.close();
