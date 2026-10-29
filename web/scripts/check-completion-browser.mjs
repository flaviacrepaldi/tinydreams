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
 await cdp('Page.enable');await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
 await js("showDemo();openForm();document.querySelector('#goalTitle').value='Teste de sequência';document.querySelector('#goalNext').click();document.querySelector('#goalNext').click()");
 assert.equal(await js("goalStep"),2);
 assert.equal(await js("document.querySelector('#goalCompletionMode').value"),'total');
 assert.equal(await js("document.querySelector('#goalEndField').hidden"),true);
 await js("document.querySelector('#goalTarget').value=21;document.querySelector('#goalStart').value='2026-11-01';syncDuration()");
 assert.equal(await js("document.querySelector('#goalTarget').value"),'21');
 await js("document.querySelector('#goalCompletionMode').value='streak';document.querySelector('#goalCompletionMode').dispatchEvent(new Event('change',{bubbles:true}))");
 for(const width of [390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  assert.equal(await js("document.querySelector('#goalDialog').scrollWidth>document.querySelector('#goalDialog').clientWidth"),false);
  const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-completion-${width}.png`,Buffer.from(png.data,'base64'));
 }
 await js("document.querySelector('#goalNext').click();document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");
 assert.equal(await js("state.goals.at(-1).plan.completionMode"),'streak');
 assert.equal(await js("state.goals.at(-1).target"),21);
 assert.equal(await js("!!document.querySelector('[data-goal=\"'+state.goals.at(-1).id+'\"]')"),false);
 await js("openForm(state.goals.at(-1).id);showGoalStep(2);document.querySelector('#goalCompletionMode').value='period';syncDuration()");
 assert.equal(await js("document.querySelector('#goalStart').required&&document.querySelector('#goalEnd').required"),true);
 assert.equal(await js('validateGoalStep()'),false);
 await js("document.querySelector('#goalStart').value='2026-11-01';document.querySelector('#goalEnd').value='2026-11-07';syncDuration()");
 assert.equal(await js("document.querySelector('#goalTarget').value"),'7');
 assert.equal(await js("document.querySelector('#goalTarget').readOnly"),true);
 await js("document.querySelector('#goalCompletionMode').value='total';syncDuration();document.querySelector('#goalTarget').value=21;document.querySelector('#goalStart').value='2026-11-03';syncDuration()");
 assert.equal(await js("document.querySelector('#goalTarget').value"),'21');
 assert.equal(await js('formPlan().end'),'');
 await js("document.querySelector('#goalDialog').close();openForm();document.querySelector('#goalKind').value='daily-list';selectDailyList();showGoalStep(2)");
 assert.equal(await js("document.querySelector('#completionModeField').hidden"),false);
 await js("document.querySelector('#goalKind').value='amount';syncKind();showGoalStep(2)");
 assert.equal(await js("document.querySelector('#completionModeField').hidden"),true);
 assert.equal(await js("document.querySelector('#goalEnd').disabled"),false);
 console.log('PASS: actual wizard save/edit, future visibility, total/streak/period controls, required dates, daily lists, amount deadlines, mobile/desktop overflow. Demo only.');
}finally{await cdp('Page.close');ws.close()}
