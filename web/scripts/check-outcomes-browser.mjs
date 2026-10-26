import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function capture(name,selector,width=390){await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');if(selector)await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);await new Promise(r=>setTimeout(r,100));const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(new URL('../../.impeccable/review/outcomes-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));if(await js('document.documentElement.scrollWidth>innerWidth'))throw Error('Horizontal overflow')}

await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");await js('showDemo()');await click('#newGoalButton');
await js("document.querySelector('#goalTitle').value='Meu combinado';document.querySelector('#goalStart').value=dayBefore(3);const end=dateFrom(today());end.setDate(end.getDate()+7);document.querySelector('#goalEnd').value=localDay(end);document.querySelector('#goalEnd').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#habitMeasure').value='impulse';syncKind();document.querySelector('#goalSupport').value='Parar e lembrar do meu combinado'");
await capture('form','#impulseFields');await js("document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open&&document.querySelector('#progressDialog').open");
const goalId=await js('state.goals.at(-1).id');
if(!await js(`pendingPastDays(state.goals.find(g=>g.id==='${goalId}'),today()).length===3`))throw Error('Backfill not offered');
await capture('pending','#pastHistoryTitle');await click('[data-past-status=success]');await wait(`state.goals.find(g=>g.id==='${goalId}').days.length===1`);
await click('[data-past-status=failure]');await wait(`state.goals.find(g=>g.id==='${goalId}').failures.length===1`);
if(!await js(`pendingPastDays(state.goals.find(g=>g.id==='${goalId}'),today()).length===1`))throw Error('Unknown days became failures');
await js("document.querySelector('#historyFilter').value='all';document.querySelector('#historyFilter').dispatchEvent(new Event('change',{bubbles:true}))");
await capture('results','#pastHistoryTitle');await js("document.querySelector('#routineDay').value=today();renderRoutineChecks();document.querySelector('#urgeNote').value='Meu registro';document.querySelector('#urgeForm').requestSubmit()");await wait(`state.goals.find(g=>g.id==='${goalId}').entries.length===1`);
if(await js(`state.goals.find(g=>g.id==='${goalId}').days.includes(today())`))throw Error('Moment completed whole day');
await click('[data-outcome=failure]');await wait(`state.goals.find(g=>g.id==='${goalId}').failures.includes(today())`);
if(!await js(`streak(state.goals.find(g=>g.id==='${goalId}'))===0`))throw Error('Failure did not break current streak');
await click('[data-outcome=success]');await wait(`state.goals.find(g=>g.id==='${goalId}').days.includes(today())`);
await capture('impulse','#routineChecks');await capture('desktop','#routineChecks',1440);
await click('[data-outcome=clear]');await wait(`!outcomeOf(state.goals.find(g=>g.id==='${goalId}'),today())`);
if(!await js(`state.goals.find(g=>g.id==='${goalId}').entries.length===1`))throw Error('Clearing day erased moment victory');
await click('[data-close=progressDialog]');await click('[data-view=calendar]');await js(`state.calendarGoal='${goalId}';renderCalendar()`);await capture('calendar','#content');
if(!await js("!!document.querySelector('.calendar-day.has-failure')"))throw Error('Calendar missing failures');await click('.calendar-day.has-failure');await wait("document.querySelector('#progressDialog').open");
await click('[data-close=progressDialog]');
const realId=await js(`(async()=>{const source=state.goals.find(g=>g.id==='${goalId}');const saved=await api('','POST',{title:'QA impulse persistence',target:source.target,color:'sage',reward:'',plan:source.plan});state.demo=false;state.goals=[saved];return saved.id})()`);
await js(`openDetails('${realId}',dayBefore(1))`);await click('[data-outcome=failure]');await wait(`state.goals.find(g=>g.id==='${realId}').failures.length===1`);
await cdp('Page.reload');await wait(`typeof state!=='undefined'&&!state.busy&&state.goals.some(g=>g.id==='${realId}')`);
if(!await js(`state.goals.find(g=>g.id==='${realId}').failures.length===1`))throw Error('Failure did not persist');
await js(`api('/${realId}','DELETE')`);
console.log('PASS: impulse creation, automatic past-day backfill, success/failure/unknown distinction, independent moment victories, outcome corrections, streak, calendar, mobile/desktop, persistence and cleanup.');ws.close();
