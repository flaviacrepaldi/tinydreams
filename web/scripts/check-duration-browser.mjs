import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function screenshot(name,width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await js("document.querySelector('#goalDialog').scrollTop=document.querySelector('#emojiChoices').offsetTop-90");await new Promise(r=>setTimeout(r,300));const m=await cdp('Page.getLayoutMetrics');const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});await writeFile(new URL('../../.impeccable/review/emoji-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));const overflow=await js('document.documentElement.scrollWidth>innerWidth');if(overflow)throw Error('Horizontal overflow at '+width)}





await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");await js('showDemo()');await click('#newGoalButton');if(!await js("document.querySelector('#goalTarget').value===''"))throw Error('Default target still prefilled');
await js("document.querySelector('#goalStart').value='2026-10-26';document.querySelector('#goalEnd').value='2026-11-01';document.querySelector('#goalEnd').dispatchEvent(new Event('input',{bubbles:true}))");
if(!await js("document.querySelector('#goalTarget').value==='7' && document.querySelector('#goalTarget').readOnly"))throw Error('Inclusive dates did not update target');
await js("document.querySelectorAll('#goalWeekdays input').forEach(input=>{input.checked=[1,3,5].includes(Number(input.value))});document.querySelector('#goalWeekdays input').dispatchEvent(new Event('change',{bubbles:true}))");
if(!await js("document.querySelector('#goalTarget').value==='3'"))throw Error('Weekday change did not update target');
await js("document.querySelector('#habitMeasure').value='quantity';syncKind();document.querySelector('#goalDailyTarget').value=2;document.querySelector('#goalDailyUnit').value='litros';document.querySelector('#goalEnd').value='2026-10-26';document.querySelector('#goalEnd').dispatchEvent(new Event('change',{bubbles:true}))");
if(!await js("document.querySelector('#goalTarget').value==='1' && document.querySelector('#goalDailyTarget').value==='2'"))throw Error('Daily quantity affected');
await js("document.querySelector('#goalEnd').value='2026-10-25';document.querySelector('#goalEnd').dispatchEvent(new Event('change',{bubbles:true}))");if(!await js("!document.querySelector('#goalTarget').validity.valid"))throw Error('Inverted dates accepted');
await js("document.querySelector('#goalKind').value='amount';syncKind();document.querySelector('#goalTarget').value=10000;document.querySelector('#goalEnd').value='2026-11-01';document.querySelector('#goalEnd').dispatchEvent(new Event('change',{bubbles:true}))");if(!await js("document.querySelector('#goalTarget').value==='10000' && document.querySelector('#goalTarget').validity.valid"))throw Error('Amount goal changed');
console.log('PASS: inclusive dates, selected weekdays, same-day period, daily quantity preserved, invalid range, amount target preserved.');ws.close();
