import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
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
 {...base,id:'daily-list',title:'Exemplo de lista diária parcial',plan:{...base.plan,start:dayBefore(6),dailyList:true,tasks:[{id:'a',weekdays:base.plan.weekdays},{id:'b',weekdays:base.plan.weekdays}]},days:[dayBefore(5)],failures:[dayBefore(6)],entries:[0,1,2,3].map(n=>({key:dayBefore(n)+':a',day:dayBefore(n),value:1}))},
 {...base,id:'counter',title:'Exemplo de contador diário',plan:{...base.plan,dailyCounter:true,dailyTarget:3,unit:'vezes'},entries:[{key:'a',day:today(),value:1}]}
 );render()})()`);

assert.equal(await js("document.querySelectorAll('.analysis-map-row').length"),12);
assert.equal(await js("!!document.querySelector('.analysis-dream')"),false,'Do not repeat individual goal-progress percentages');
assert.ok(await js("document.querySelector('.analytics-view').innerText.trim().split(/\\s+/).length<180"),'Default view keeps explanations and audit counts out of the visual overview');
assert.ok(await js("document.querySelector('.analysis-history .analysis-records').textContent.includes('3,75 reais registrados')"));
assert.equal(await js("document.querySelectorAll('.analysis-day').length"),7);
await js("const select=document.querySelector('#analyticsGoal');select.value='daily-list';select.dispatchEvent(new Event('change',{bubbles:true}))");
assert.equal(await js("document.querySelectorAll('.analysis-map-row').length"),1);
assert.ok(await js("document.querySelector('.analysis-history .analysis-records').textContent.includes('1 concluídos · 1 falhas · 3 incompletos · 1 sem registro')"),'Separate explicit failures, incomplete lists and missing days');
assert.equal(await js("document.querySelectorAll('.analysis-cells .is-partial').length"),4,'Today is shown in progress but outside closed-day counts');
await js("document.querySelector('#analyticsGoal').value='all';document.querySelector('#analyticsGoal').dispatchEvent(new Event('change',{bubbles:true}))");
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js('document.fonts.ready');await new Promise(r=>setTimeout(r,150));
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'No horizontal overflow');
 assert.equal(await js("document.querySelectorAll('.analysis-row').length"),17);
 assert.equal(await js("document.querySelectorAll('.analysis-cells>.analysis-cell').length"),12*28);
 assert.equal(await js("document.querySelector('.tab[data-view=analytics]').disabled"),false);
 const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile('/tmp/analytics-'+width+'.png',Buffer.from(png.data,'base64'));
 for(const [name,selector] of [['history','.analysis-history'],['activity','.analysis-activity']]){
  const clip=await js(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
  await writeFile('/tmp/analytics-'+name+'-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true})).data,'base64'));
 }
 await js("document.querySelector('.analysis-comparisons').open=true");
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'Expanded comparisons fit');
 const clip=await js("(()=>{const r=document.querySelector('.analysis-comparisons').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
 await writeFile('/tmp/analytics-comparisons-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true})).data,'base64'));
 await js("document.querySelector('.analysis-comparisons').open=false");
}
await js("document.querySelector('.analysis-history .analysis-records').open=true");
assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'Auditable dates fit the page');
await js("state.goals=state.goals.filter(g=>['amount','list','impulse'].includes(g.id));renderAnalytics()");
assert.equal(await js("document.querySelectorAll('.analysis-map-row').length"),3);
assert.equal(await js("!!document.querySelector('.analysis-comparisons')"),false,'Do not show empty habit comparisons for other types');
assert.equal(await js("!!document.querySelector('.analysis-empty')"),false);
await js("document.querySelector('[data-action=analytics-create]').click()");
assert.ok(await js("document.querySelector('#goalDialog').open"));
await js("document.querySelector('#goalDialog').close()");
if(process.env.TINY_QA_ANALYTICS_SNAPSHOT){
 const snapshot=JSON.parse(await readFile(process.env.TINY_QA_ANALYTICS_SNAPSHOT,'utf8'));
 await js(`state.demo=true;state.goals=${JSON.stringify(snapshot)};analyticsGoal='all';renderAnalytics();window.analyticsSnapshotBefore=JSON.stringify(state.goals)`);
 for(const width of [320,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
  await js('document.fonts.ready');
  assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
  await writeFile('/tmp/analytics-personal-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 }
 assert.equal(await js('JSON.stringify(state.goals)===analyticsSnapshotBefore'),true,'Snapshot rendering never changes stored records');
}
console.log('PASS visual analytics: dated map, partial vs failure regression, unit-preserving activity, filters, auditable dates, no redundant progress and all responsive widths');
ws.close();
