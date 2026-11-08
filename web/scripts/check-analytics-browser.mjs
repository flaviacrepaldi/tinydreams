import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");

await js("state.view='analytics';state.goals=[];render()");
assert.ok(await js("!!document.querySelector('.analysis-empty')"));
await js(`(()=>{state.demo=true;state.goals=Array.from({length:6},(_,i)=>({id:'analysis-'+i,title:'Exemplo de análise',target:i<2?7:i<4?21:90,days:[dayBefore(1),dayBefore(2),dayBefore(3),dayBefore(4)],failures:i<2?[]:[dayBefore(5),dayBefore(6)],plan:{...planOf({}),start:dayBefore(7),end:today(),weekdays:i<2?[1,2,3]:[0,1,2,3,4,5,6]}}));render()})()`);
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js('document.fonts.ready');await new Promise(r=>setTimeout(r,150));
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'No horizontal overflow');
 assert.equal(await js("document.querySelectorAll('.analysis-row').length"),17);
 assert.equal(await js("document.querySelector('.tab[data-view=analytics]').disabled"),false);
 const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile('/tmp/analytics-'+width+'.png',Buffer.from(png.data,'base64'));
}
await js("document.querySelector('[data-action=analytics-create]').click()");
assert.ok(await js("document.querySelector('#goalDialog').open"));
console.log('PASS analytics: empty state, charts, responsive widths, enabled navigation and create action');
ws.close();
