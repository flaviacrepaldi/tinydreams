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
await js(`(()=>{const base={target:10,color:'sage',days:[],failures:[],entries:[],plan:{...planOf({}),start:dayBefore(7)}};state.goals.push(
 {...base,id:'amount',title:'Exemplo de quantia com título bem longo para conferir a quebra de linha no relatório',plan:{...base.plan,kind:'amount',unit:'reais'},entries:[{key:'a',day:today(),value:2.5},{key:'b',day:today(),value:1.25}]},
 {...base,id:'list',title:'Exemplo de lista única',plan:{...base.plan,kind:'list',items:[{id:'a'},{id:'b'}]},entries:[{key:'a',day:today(),value:1}]},
 {...base,id:'impulse',title:'Exemplo de impulso',plan:{...base.plan,impulse:true,impulseStartedAt:new Date(Date.now()-36*3600000).toISOString()}},
 {...base,id:'partial',title:'Exemplo de quantidade diária parcial',plan:{...base.plan,dailyTarget:2,unit:'litros'},entries:[{key:'a',day:today(),value:0.5}]},
 {...base,id:'daily-list',title:'Exemplo de lista diária parcial',plan:{...base.plan,dailyList:true,tasks:[{id:'a',weekdays:base.plan.weekdays}]},entries:[{key:today()+':a',day:today(),value:1}]},
 {...base,id:'counter',title:'Exemplo de contador diário',plan:{...base.plan,dailyCounter:true,dailyTarget:3,unit:'vezes'},entries:[{key:'a',day:today(),value:1}]}
 );render()})()`);
assert.equal(await js("document.querySelectorAll('.analysis-dream').length"),12);
assert.ok(await js("document.querySelector('.analysis-overview').textContent.includes('3,75 / 10')"),'Cumulative amount must appear even with no daily check-ins');
assert.ok(await js("document.querySelector('.analysis-overview').textContent.includes('0,5 litros registrados')"),'Partial measurements are visible');
assert.equal(await js("document.querySelectorAll('.analysis-activity-row').length"),7);
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js('document.fonts.ready');await new Promise(r=>setTimeout(r,150));
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'No horizontal overflow');
 assert.equal(await js("document.querySelectorAll('.analysis-row').length"),17);
 assert.equal(await js("document.querySelector('.tab[data-view=analytics]').disabled"),false);
 const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile('/tmp/analytics-'+width+'.png',Buffer.from(png.data,'base64'));
 for(const [name,selector] of [['overview','.analysis-overview'],['activity','.analysis-activity']]){
  const clip=await js(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
  const capture=await cdp('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
  await writeFile('/tmp/analytics-'+name+'-'+width+'.png',Buffer.from(capture.data,'base64'));
 }
 assert.equal(await js("[...document.querySelectorAll('.analysis-dream')].some(e=>e.scrollWidth>e.clientWidth+1)"),false,'Long titles and units must wrap inside the report');
}
await js("state.goals=state.goals.filter(g=>['amount','list','impulse','partial','daily-list','counter'].includes(g.id));render()");
assert.equal(await js("document.querySelectorAll('.analysis-dream').length"),6,'All non-simple variants remain visible without simple habits');
assert.equal(await js("!!document.querySelector('.analysis-empty')"),false,'Existing records must not show a first-use empty state');
assert.ok(await js("document.querySelector('.analysis-overview').textContent.includes('3,75 / 10')"));
await js("document.querySelector('[data-action=analytics-create]').click()");
assert.ok(await js("document.querySelector('#goalDialog').open"));
console.log('PASS all-type analytics: empty state, charts, responsive widths, enabled navigation and create action');
ws.close();
