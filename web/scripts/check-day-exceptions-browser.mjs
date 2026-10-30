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
 await js(`showDemo();state.goals=[{id:'qa',title:'Salada e treino',color:'sage',target:30,reward:'',days:[],failures:[],entries:[],plan:{...planOf({}),start:dayBefore(5)}}];render();openDetails('qa',dayBefore(1))`);
 assert.equal(await js("document.querySelector('.outcome-status').textContent"),'falha registrada');
 await js("document.querySelector('#dayNote').value='Estava sem fome, comi menos e fiquei bem';document.querySelector('[data-save-day-note]').click()");await wait('!state.busy');
 assert.equal(await js("state.goals[0].plan.dayNotes[dayBefore(1)]"),'Estava sem fome, comi menos e fiquei bem');
 await js("document.querySelector('#routineDay').value=dayBefore(-3);renderRoutineChecks();document.querySelector('[data-outcome=skipped]').click()");await wait('!state.busy');
 assert.equal(await js("outcomeOf(state.goals[0],dayBefore(-3))"),'skipped');
 for(const width of [390,1440]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-outcomes-'+width+'.png',Buffer.from(png.data,'base64'));
 }
 console.log('PASS: inferred failure, saved context, future skip, mobile and desktop layout');
}finally{ws.close()}
