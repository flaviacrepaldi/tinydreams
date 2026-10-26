import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4175',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function screenshot(name,width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await new Promise(r=>setTimeout(r,300));const m=await cdp('Page.getLayoutMetrics');const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(m.cssContentSize.height),scale:1}});await writeFile(new URL('../../.impeccable/review/planner-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));const overflow=await js('document.documentElement.scrollWidth>innerWidth');if(overflow)throw Error('Horizontal overflow at '+width)}

await mkdir(new URL('../../.impeccable/review/',import.meta.url),{recursive:true});
await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4175'});
await wait("typeof state!=='undefined' && !state.busy");
await js('showDemo()');
await screenshot('desktop',1440,1000);await screenshot('mobile',390,844);
await click('#newGoalButton');
for(const template of ['skin','books','money']){
 await js(`document.querySelector('#goalTitle').value='Teste de ${template}';document.querySelector('#goalKind').value='${template==='skin'?'habit':template==='books'?'list':'amount'}';syncKind();document.querySelector('#goalTarget').value=${template==='money'?10000:30};`);
 if(template==='skin')await js("document.querySelector('#habitMeasure').value='tasks';syncKind();addRoutineRow({id:'test-task',title:'Tarefa de teste',weekdays:[0,1,2,3,4,5,6]})");
 if(template==='books')await js("addItemRow({id:'test-item',title:'Item de teste',date:''})");


 await screenshot('form-'+template,390,844);
 const valid=await js("document.querySelector('#goalForm').checkValidity()");if(!valid)throw Error('Invalid custom form '+template);
 await js("document.querySelector('#goalForm').requestSubmit()");
 await wait("!document.querySelector('#goalDialog').open");
 if(template==='skin'){
  const id=await js("state.goals.at(-1).id");await click(`[data-action=details][data-id="${id}"]`);
  await screenshot('routine',390,844);await click('[data-entry-key]');
  await wait(`state.goals.find(g=>g.id==='${id}').entries?.length>0`);
  await click('[data-close=progressDialog]');
 }
 if(template==='books'){
  const id=await js("state.goals.at(-1).id");await click(`[data-action=details][data-id="${id}"]`);
  await screenshot('books',390,844);await click('[data-entry-key]');
  await wait(`progress(state.goals.find(g=>g.id==='${id}'))===1`);await click('[data-close=progressDialog]');
 }
 if(template==='money'){
  const id=await js("state.goals.at(-1).id");await click(`[data-action=details][data-id="${id}"]`);
  await js("document.querySelector('#entryValue').value='1250.50';document.querySelector('#amountForm').requestSubmit()");
  await wait(`progress(state.goals.find(g=>g.id==='${id}'))===1250.5`);await screenshot('money',390,844);await click('[data-close=progressDialog]');
 }
 await click('#newGoalButton');
}
await click('[data-close=goalDialog]');
await click('[data-view=today]');await screenshot('today',390,844);
await click('[data-view=calendar]');await screenshot('calendar',390,844);
await click('[data-view=dreams]');await screenshot('all',1440,1000);
await cdp('Page.reload');await wait("typeof state!=='undefined' && !state.busy");
await click('#newGoalButton');
await js("document.querySelector('#goalTitle').value='QA planner persistence';document.querySelector('#goalKind').value='amount';syncKind();document.querySelector('#goalTarget').value=10000;document.querySelector('#goalForm').requestSubmit()");
await wait("!document.querySelector('#goalDialog').open");
const id=await js("state.goals.find(g=>g.title==='QA planner persistence').id");
await click(`[data-action=details][data-id="${id}"]`);
await js("document.querySelector('#entryValue').value=1200;document.querySelector('#amountForm').requestSubmit()");await wait(`progress(state.goals.find(g=>g.id==='${id}'))===1200`);
await cdp('Page.reload');await wait(`typeof state!=='undefined' && state.goals.some(g=>g.id==='${id}')`);
if(!await js(`progress(state.goals.find(g=>g.id==='${id}'))===1200`))throw Error('Deposit not persisted');
await click(`[data-action=delete][data-id="${id}"]`);await click('#confirmDelete');await wait(`!state.goals.some(g=>g.id==='${id}')`);
console.log('PASS: custom habit, list, and amount forms, mobile/desktop, routine tasks, named monthly books, deposits, tabs, API persistence and cleanup.');ws.close();
