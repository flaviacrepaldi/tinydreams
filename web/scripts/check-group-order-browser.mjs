import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");

await js(`showDemo();state.homeFilter='all';state.groups=[{id:'order',name:'Meus cuidados'}];state.goals.forEach((g,i)=>{g.group_id='order';g.title=i===0?'Um título longo para conferir a ordem dos meus cuidados na tela inicial':g.title});render()`);
const original=await js('state.goals.map(g=>g.id)');
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
 await js(`openGroup('order')`);
 assert.equal(await js("document.querySelector('#groupOrder [data-move=\"-1\"]').disabled"),true);
 await js("document.querySelector('#groupOrder [data-move=\"1\"]').click()");
 const expected=[original[1],original[0],...original.slice(2)];
 assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),expected);
 assert.ok(await js("(()=>{const d=document.querySelector('#groupDialog');return d.scrollWidth<=d.clientWidth+1&&d.getBoundingClientRect().left>=0})()"));
 await js('document.fonts.ready');
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/group-order-'+width+'.png',Buffer.from(png.data,'base64'));
 await js("document.querySelector('#groupForm').requestSubmit()");await wait("!document.querySelector('#groupDialog').open");
 assert.deepEqual(await js('state.groups[0].goalOrder'),expected);
 assert.deepEqual(await js("[...document.querySelectorAll('.big-dream-volume .goal')].map(g=>g.dataset.goal)"),expected);
 await js(`openGroup('order');document.querySelector('#groupOrder [data-move="-1"]:not(:disabled)').click();document.querySelector('#groupForm').requestSubmit()`);await wait("!document.querySelector('#groupDialog').open");
 assert.deepEqual(await js('state.groups[0].goalOrder'),original);
}
await js(`openGroup('order');document.querySelector('#groupOrder [data-move="1"]').click();document.querySelector('#groupDialog').close();openGroup('order')`);
assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),original,'Cancel discards draft');
console.log('PASS: Big Dream order forward/backward, save, reopen, cancel and wrapped titles at 320/390/430/1280px.');ws.close();
