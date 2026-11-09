import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
const errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});await cdp('Runtime.enable');
await js(`window.rewardWrites=[];window.rewardTestFetch=window.fetch;window.fetch=(url,options={})=>{if(options.method&&!['GET','HEAD'].includes(options.method))rewardWrites.push(options.method+' '+url);return rewardTestFetch(url,options)};window.rewardRealBefore=JSON.stringify(state.real);`);
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 for(const scenario of ['item','fusion','milestone','record','return','day','dream','art']){
  await js(`rewardDemo(${JSON.stringify(scenario)})`);await wait('!state.busy');
  assert.equal(await js('state.demo'),true);
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,`${width} ${scenario}: horizontal overflow`);
  if(scenario==='item'){
   assert.equal(await js("document.querySelectorAll('.daily-list-item[aria-pressed=true]').length"),1);
   assert.equal(await js("document.querySelector('.reward-check-drawn')!==null"),true);
   assert.equal(await js('dayDone(state.goals[0],today())'),false);
   if(width===320)assert.equal(await js(`(()=>{const h=document.querySelector('#progressTitle'),text=h.firstChild,word='alimentação',at=text.textContent.indexOf(word),range=document.createRange();range.setStart(text,at);range.setEnd(text,at+word.length);return range.getClientRects().length===1})()`),true,'Checklist title must not split alimentação into an orphan letter');
  }
  if(scenario==='fusion'){
   assert.equal(await js("document.querySelector('.reward-fusion .fusion-day')!==null"),true);
   assert.equal(await js('dayDone(state.goals[0],today())'),true);
  }
  if(scenario==='milestone')assert.equal(await js("document.querySelector('.practice-achievement .practice-seal>span').textContent"),'7');
  if(scenario==='record'){
   assert.equal(await js('rewardSequence(state.goals[0]).record'),true);
   assert.equal(await js("document.querySelector('#milestone h2').textContent"),'seu novo recorde.');
   assert.equal(await js("document.querySelector('.reward-record')"),null,'Cards keep the streak phrase without a duplicate record badge');
  }
  if(scenario==='return'){
   assert.equal(await js('rewardSequence(state.goals[0]).resumed'),true);
   assert.match(await js("document.querySelector('#milestone h2').textContent"),/você voltou/);
  }
  if(scenario==='day')assert.equal(await js("document.querySelector('.daily-keepsakes').classList.contains('all-complete')"),true);
  if(scenario==='dream'){
   assert.equal(await js("document.querySelector('.final-chapter .achievement-medal')!==null"),true);
   assert.equal(await js("document.querySelectorAll('.reward-badge-peek .achievement-medal').length"),1);
  }
  if(scenario==='art'){
   assert.equal(await js("collectionView==='achievements'"),true);
   assert.equal(await js("document.querySelectorAll('.achievement-button').length"),6);
   assert.equal(await js("document.querySelector('.reward-reveal')"),null);
  }
  await new Promise(r=>setTimeout(r,1000));
  if(['record','return','milestone'].includes(scenario)){
   assert.equal(await js(`(()=>{const seal=document.querySelector('.practice-achievement'),label=seal.querySelector(':scope>span:not(.practice-seal)').getBoundingClientRect(),number=seal.querySelector('.practice-seal>span').getBoundingClientRect(),box=seal.getBoundingClientRect();const radius=box.width*18/48;return label.top>number.bottom&&[[label.left,label.top],[label.right,label.top],[label.left,label.bottom],[label.right,label.bottom]].every(([x,y])=>Math.hypot(x-(box.left+box.width/2),y-(box.top+box.height/2))<radius-2)})()`),true,`${width} ${scenario}: label clears the number and inner stitched circle`);
  }
  await writeFile(`/tmp/reward-${scenario}-${width}.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  if(scenario==='milestone'){
   await js('dismissMilestone()');
   await new Promise(r=>setTimeout(r,100));
   assert.equal(await js("document.querySelector('[data-practice-milestone=\"7\"]').classList.contains('reward-received')"),true);
   await js("saveOutcome(state.goals[0].id,today(),null)");await wait('!state.busy');
   assert.equal(await js('rewardFlights.size'),0,'Undo cancels an in-flight seal');
   assert.equal(await js("document.querySelector('[data-practice-milestone=\"7\"]')"),null);
  }
 }
 console.log('PASS reward scenarios at '+width);
}
await js("rewardDemo('item')");
await js("document.querySelector('.daily-list-item[aria-pressed=true]').click()");await wait('!state.busy');
await js("document.querySelector('.daily-list-item[aria-pressed=false]').click()");await wait('!state.busy');
assert.equal(await js('rewardFlights.size>0'),true,'A real item click sends light to visible progress');
await js('rewardCancelFlights()');
// Large amount targets still fit their permanent book seal.
assert.equal(await js(`(()=>{for(const number of [10000,1000000000]){const g={target:number,color:'sage',days:[],entries:[{key:'a',day:today(),value:number}],plan:{kind:'amount',unit:'R$'}};const book=document.createElement('div');book.className='dream-book';book.style.cssText='position:fixed;width:125px;height:165px;visibility:hidden';book.innerHTML=rewardBookFinish(g);document.querySelector('#progressDialog').append(book);const text=book.querySelector('.practice-seal>span').getBoundingClientRect(),seal=book.querySelector('.book-journey-seal').getBoundingClientRect();const fits=text.width<=seal.width-2;book.remove();if(!fits)return false;}return true})()`),true);
// Record counts are schedule-aware; rest and skipped dates do not break continuity.
assert.equal(await js(`rewardSequence({days:['2026-11-02','2026-11-03','2026-11-05'],failures:[],plan:{kind:'habit',weekdays:[1,2,3,4,5,6],skippedDays:['2026-11-04']}}).best`),3);
assert.equal(await js(`rewardSequence({days:['2026-11-02','2026-11-04','2026-11-05'],failures:['2026-11-03'],plan:{kind:'habit',weekdays:[0,1,2,3,4,5,6]}}).best`),2);
// Elapsed impulse milestones celebrate without inventing a daily check-in.
await js("rewardDemo('day')");
await js("dismissMilestone(false);const g=state.goals[0];g.id='elapsed-reward';g.days=[];g.plan={...g.plan,impulse:true,impulseStartedAt:new Date(Date.now()-3*86400000-1000).toISOString()};milestoneMemory.clear();render();animateProgress(g,2)");
assert.equal(await js("document.querySelector('.practice-achievement .practice-seal>span').textContent"),'3');
assert.equal(await js("document.querySelector('#milestone [data-scene]').dataset.scene"),'interval');
assert.equal(await js('state.goals[0].days.length'),0);
await js('dismissMilestone(false)');
// Reduced and manually paused motion keep the result without moving particles.
for(const reduced of [true,false]){
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]});
 if(!reduced)await js("document.querySelector('#motionToggle').checked=false;document.querySelector('#motionToggle').dispatchEvent(new Event('change'))");
 await js("rewardDemo('fusion')");
 assert.equal(await js("getComputedStyle(document.querySelector('.fusion-day')).animationName"),'none');
 assert.equal(await js('rewardFlights.size'),0);
}
// The new collection supports empty, historical, repeated and corrected achievements.
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js(`resetMilestonePanel();state.demo=true;state.groups=[];state.goals=[];selectedAchievement='';openAchievements()`);
 assert.equal(await js("document.querySelectorAll('.achievement-medal.is-locked').length"),6);
 assert.equal(await js("document.querySelectorAll('.achievement-edition').length"),1,'Only current theme is shown before achievements');
 await js(`(()=>{const p={...planOf({}),kind:'habit',start:'',end:'',weekdays:[0,1,2,3,4,5,6],completionMode:'total'};state.groups=[{id:'badge-group',name:'um grande sonho com um nome longo'}];state.goals=[{id:'badge-a',title:'ler um capítulo com calma e guardar uma lembrança desta jornada',target:1,color:'sage',days:[today()],plan:p,group_id:'badge-group'},{id:'badge-b',title:'outro pequeno capítulo',target:1,color:'peach',days:[today()],plan:p,group_id:'badge-group'},{id:'badge-history',title:'uma história de outubro',target:1,color:'sage',days:['2026-10-01'],plan:p},{id:'badge-practice',title:'cultivar uma rotina',target:30,color:'sage',days:Array.from({length:15},(_,i)=>dayBefore(i)),plan:p}];openAchievements()})()`);
 assert.equal(await js("achievementEvents().filter(e=>e.kind==='theme'&&e.day===today()).length"),2);
 assert.equal(await js("achievementEvents().filter(e=>e.kind==='big').length"),1);
 await js(`document.querySelector('[data-achievement="'+DreamThemes.current.id+':theme"]').click()`);
 assert.equal(await js("document.querySelector('[data-achievement][aria-expanded=true]')!==null"),true);
 assert.equal(await js("document.querySelectorAll('.achievement-detail:not([hidden])').length"),1);
 assert.ok(await js("document.querySelector('.achievement-detail:not([hidden])').getBoundingClientRect().width>=Math.min(innerWidth*.6,400)"),'Expanded records use the full collection row');
 assert.equal(await js("document.querySelector('.reward-reveal')"),null);
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 await js('document.fonts.ready');
 await writeFile(`/tmp/achievements-${width}.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:await js('document.documentElement.scrollHeight'),scale:1}})).data,'base64'));
 await js(`state.goals.find(g=>g.id==='badge-b').days=[];renderShelf()`);
 assert.equal(await js("achievementEvents().some(e=>e.kind==='big')"),false,'Undo removes an unearned group achievement');
}
assert.equal(await js('JSON.stringify(state.real)===rewardRealBefore'),true,'Real records unchanged');
assert.deepEqual(await js('rewardWrites'),[],'Demos never send record mutations');
assert.deepEqual(errors,[]);
console.log('PASS: eight reward demos, persistent achievements, seal return/cancellation, record/rest rules, reduced/manual motion, and no personal writes.');ws.close();
