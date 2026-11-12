import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");


for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 for(const kind of ['habit','impulse','amount','list']){
  await js(`(()=>{state.view='dreams';showDemo();state.homeFilter='all';state.groups=[];state.goals=[{id:'finished',title:'não aumentar minhas faturas',target:7,color:'sage',reward:'escolher um produto muito desejado (e desnecessário, mas lindo) de blogueira',redeemed:1,days:[6,5,4,3,2,1,0].map(dayBefore),entries:[],plan:{...planOf({}),kind:'habit',completionMode:'streak',notes:'Um acordo comigo que pode ocupar duas linhas.'}}];const g=state.goals[0];if('${kind}'==='amount'){g.plan.kind='amount';g.entries=[{key:'total',day:today(),value:7}]}if('${kind}'==='list'){g.plan.kind='list';g.plan.items=[{id:'one',title:'uma etapa'}];g.entries=[{key:'one',day:today(),value:1}]}if('${kind}'==='impulse'){g.plan.impulse=true;g.plan.impulseStartedAt=new Date(Date.now()-7*86400000-1000).toISOString()}seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#demoBanner').hidden=true})()`);
  await js('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
  await js("document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#mobileDreams').scrollTop=0");
  assert.equal(await js("getComputedStyle(document.querySelector('.goal')).visibility"),'visible');
  assert.equal(await js("document.querySelector('[data-action=redeem]')"),null);
  assert.equal(await js("document.querySelector('.goal').dataset.complete"),'true');
  assert.equal(await js("document.querySelector('.goal').getBoundingClientRect().height"),582);
  assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
  const layout=await js("(()=>{const c=document.querySelector('.goal'),reward=c.querySelector('.reward').getBoundingClientRect(),bar=c.querySelector('.dream-progress').getBoundingClientRect(),a=c.querySelector('.completed-shelf-link').getBoundingClientRect(),r=c.getBoundingClientRect();return {overflow:c.scrollHeight-c.clientHeight,rewardGap:reward.top-bar.bottom,actionGap:a.top-reward.bottom,bottom:r.bottom-a.bottom}})()");
  assert.ok(layout.overflow<=1&&layout.rewardGap>=-1&&layout.actionGap>=0&&layout.bottom>=0,JSON.stringify({width,kind,layout}));
  const box=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
  await writeFile('/tmp/completed-'+kind+'-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:box,captureBeyondViewport:true})).data,'base64'));
  await js(`(()=>{const g=state.goals[0];g.days=[7,6,5,4,3,2,1].map(dayBefore);g.entries=g.entries.map(e=>({...e,day:dayBefore(1)}));if(g.plan.impulse)g.plan.impulseStartedAt=new Date(Date.now()-8*86400000-1000).toISOString();render()})()`);
  assert.equal(await js("document.querySelector('.goal').dataset.complete"),'true','Yesterday’s completion remains on home');
  assert.equal(await js("document.querySelector('.daily-state').textContent"),'realizado ontem');
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await js("document.querySelector('.goal').scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})");
  const yesterdayBox=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
  if(kind==='habit')await writeFile('/tmp/completed-yesterday-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:yesterdayBox,captureBeyondViewport:true})).data,'base64'));
  await js("document.querySelector('.completed-shelf-link').click()");
  await wait("!!document.querySelector('.shelf-selected')");
  assert.equal(await js("document.querySelector('[data-action=redeem]')"),null);
  assert.equal(await js("state.goals[0].redeemed"),1,'Viewing a reward never changes saved records');
  await js("document.querySelector('[data-action=shelf-book][aria-pressed=true]').click()");
  await wait("!!document.querySelector('.shelf-intro')&&!document.querySelector('.shelf-selected')");
  assert.equal(await js("document.querySelectorAll('.portrait-spine[aria-pressed=true]').length"),0,'Clicking selected book clears selection');
  await js("document.querySelector('[data-action=shelf-book]').click()");await wait("!!document.querySelector('.shelf-selected')");
  await js("document.querySelector('.shelf-selected h3').click()");
  assert.equal(await js("!!document.querySelector('.shelf-selected')"),true,'Reading selected details keeps selection');
  await js("document.querySelector('.shelf-heading').click()");
  await wait("!!document.querySelector('.shelf-intro')&&!document.querySelector('.shelf-selected')");
  assert.equal(await js("document.querySelectorAll('.portrait-spine[aria-pressed=true]').length"),0,'Clicking outside clears selection');
  assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'Deselected shelf does not overflow');
  if(kind==='habit')await writeFile('/tmp/shelf-deselected-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));

 }
}
console.log('PASS: completed habit/impulse/amount/list cards, long reward, no redemption controls, collection destination, fixed height and no overlap at four widths');
ws.close();
