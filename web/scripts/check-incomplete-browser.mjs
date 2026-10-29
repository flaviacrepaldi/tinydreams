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
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
 await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
 await js(`showDemo();reviewDeferred.clear();state.groups=[];state.goals=[{id:'expired-habit',title:'Rotina que terminou',target:3,color:'peach',reward:'Um livro',days:['2020-01-01'],failures:[],entries:[],plan:{...planOf({}),completionMode:'period',start:'2020-01-01',end:'2020-01-03'}},{id:'expired-money',title:'Valor com prazo encerrado',target:100,color:'sage',reward:'',days:[],failures:[],entries:[],plan:{...planOf({}),kind:'amount',unit:'R$',end:'2020-01-03'}},{id:'undated',title:'Hábito sem prazo',target:21,color:'lavender',reward:'',days:[],entries:[],plan:{...planOf({}),completionMode:'streak'}}];render();checkIncompleteNotice()`);
 await wait("document.querySelector('#incompleteReviewDialog').open");
 assert.equal(await js('incompleteReviewId'),'expired-habit');
 assert.equal(await js("document.querySelector('#incompleteReviewContent').textContent.includes('dias acumulados')"),true);
 const review=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-incomplete-review-mobile.png',Buffer.from(review.data,'base64'));
 await js("document.querySelector('#acceptIncomplete').click()");
 await wait("!state.busy&&state.goals[0].plan.incompleteAccepted===true");
 assert.equal(await js("!!document.querySelector('#content [data-goal=expired-habit]')"),false);
 await wait("incompleteReviewId==='expired-money'&&document.querySelector('#incompleteReviewDialog').open");
 await js("document.querySelector('#deferIncomplete').click();document.querySelector('#settingsButton').click();document.querySelector('#openIncompleteButton').click()");
 assert.equal(await js("document.querySelector('#incompleteDialog').open"),true);
 assert.equal(await js("getComputedStyle(document.querySelector('#incompleteCollection .talisman')).filter.includes('grayscale(1)')"),true);
 assert.equal(await js("state.goals[0].color"),'peach');
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 const archive=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-incomplete-archive-mobile.png',Buffer.from(archive.data,'base64'));
 await js("document.querySelector('[data-review-incomplete]').click()");
 await wait("document.querySelector('#incompleteReviewDialog').open&&incompleteReviewId==='expired-money'");
 await js("document.querySelector('#deferIncomplete').click();document.querySelector('#settingsButton').click();document.querySelector('#openIncompleteButton').click()");

 await js("document.querySelector('[data-incomplete-retry=expired-habit]').click()");
 assert.equal(await js("document.querySelector('#goalDialog').open"),true);
 assert.equal(await js("document.querySelectorAll('[data-goal-step]:not([hidden])').length"),4,'Editing shows all sections');
 assert.equal(await js("document.querySelector('#goalStepStatus').hidden&&document.querySelector('#goalNext').hidden&&!document.querySelector('#saveGoal').hidden"),true);
 assert.equal(await js("document.querySelector('#goalExtras').open"),true);
 assert.equal(await js("document.querySelector('#goalCompletionMode').value"),'total');
 await js("document.querySelector('#goalTitle').value='Rotina em uma nova tentativa';document.querySelector('#goalForm').requestSubmit()");
 await wait("!state.busy&&!document.querySelector('#goalDialog').open");
 assert.equal(await js("isArchivedIncomplete(state.goals[0])"),false);
 assert.deepEqual(await js('state.goals[0].days'),['2020-01-01']);
 assert.equal(await js("!!document.querySelector('#content [data-goal=expired-habit]')"),true);
 await js("openForm('undated')");
 assert.equal(await js("document.querySelectorAll('[data-goal-step]:not([hidden])').length"),4);
 const edit=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-continuous-edit-mobile.png',Buffer.from(edit.data,'base64'));
 await js("document.querySelector('#goalTitle').value='';document.querySelector('#goalForm').requestSubmit()");
 assert.equal(await js("document.querySelector('#goalDialog').open"),true,'Invalid editing stays open');
 assert.equal(await js("document.querySelectorAll('[data-goal-step]:not([hidden])').length"),4,'Validation preserves continuous layout');
 await js("document.querySelector('#goalDialog').close();openForm('expired-money')");
 assert.equal(await js("document.querySelectorAll('[data-goal-step]:not([hidden])').length"),3,'Amount editing excludes routine section');
 await js("document.querySelector('#goalDialog').close();openForm()");
 assert.equal(await js("document.querySelectorAll('[data-goal-step]:not([hidden])').length"),1,'Creation keeps the wizard');
 assert.equal(await js("document.querySelector('#goalStepStatus').hidden"),false);
 await js("document.querySelector('#goalDialog').close();openForm('undated')");
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const desktop=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-continuous-edit-desktop.png',Buffer.from(desktop.data,'base64'));
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 console.log('PASS: expiry review, archive acceptance, next review/defer, settings archive, gray original amulet, retry without history loss, continuous editing/validation, amount sections and unchanged creation steps. Demo only.');
}finally{await cdp('Page.close');ws.close()}
