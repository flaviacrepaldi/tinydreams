import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");

for(const [end,asOf,label] of [
 ['2026-11-09','2026-11-09','até hoje'],['2026-11-10','2026-11-09','até amanhã'],
 ['2026-11-11','2026-11-09','até quarta'],['2026-11-15','2026-11-09','até domingo'],
 ['2026-11-16','2026-11-09','até 16/11'],['2026-11-08','2026-11-09','até 08/11'],
 ['2026-12-01','2026-11-30','até amanhã'],['2027-01-01','2026-12-31','até amanhã'],
 ['2027-02-01','2026-11-09','até 01/02/2027']
])assert.equal(await js(`deadlineLabel('${end}','${asOf}')`),label);

for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js(`showDemo();state.groups=[];state.goals=[{id:'finish',title:'não aumentar minhas faturas',target:6,color:'sage',reward:'comprar um creme de mãos novo',days:[5,4,3,2,1].map(dayBefore),failures:[],entries:[],plan:{...planOf({}),completionMode:'streak',start:dayBefore(5)}}];seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#demoBanner').hidden=true`);
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('today()'));
 assert.equal(await js("document.querySelector('.target-finish-number').textContent"),'6');
 assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1,'Final day has visible rays');
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),3);
 assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
 assert.equal(await js("document.querySelector('.goal').getBoundingClientRect().height"),582);
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
 await js('document.fonts.ready');
 const box=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
 await writeFile('/tmp/streak-finish-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:box,captureBeyondViewport:true})).data,'base64'));
 await js("state.goals[0].failures=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish')"),null,'Failure resets consecutive-day projection');
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),0);
 await js("state.goals[0].failures=[];state.goals[0].plan.skippedDays=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('dayBefore(-1)'),'Skipped date does not consume remaining practice');
 await js("state.goals[0].plan.skippedDays=[];state.goals[0].days.push(today());render()");
 assert.equal(await js("document.querySelector('.target-finish')"),null);
 assert.equal(await js("document.querySelector('[data-practice-milestone=\"6\"] .practice-seal')!==null"),true);
 assert.equal(await js("document.querySelectorAll('.beyond-target').length"),3);
 assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1,'Earned final seal keeps its rays');
 await js("state.goals[0].days.pop();state.goals[0].plan.completionMode='total';render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('today()'));
 await js("state.goals[0].failures=[today()];render()");
 assert.equal(await js("document.querySelector('.target-finish').dataset.practiceDay"),await js('dayBefore(-1)'),'Recorded failure moves the accumulated goal finish to the next scheduled day');
 // Impulse goals share the same numeric finish even without a deadline.
 await js("state.goals[0].plan={...planOf({}),kind:'habit',impulse:true,impulseStartedAt:new Date(Date.now()-5*86400000-1000).toISOString()};state.goals[0].target=6;state.goals[0].days=[];state.goals[0].failures=[];render()");
 assert.equal(await js("document.querySelector('.goal-finish .target-finish-number').textContent"),'6');
 assert.equal(await js("document.querySelector('.goal-finish').classList.contains('target-finish')"),true);
 assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1);
 // Every dated habit marks its deadline, independently of its progress rules.
 for(const variant of ['total','streak','period','tasks','quantity','counter','impulse']){
  await js(`(()=>{const g=state.goals[0];g.target=30;g.days=[];g.failures=[today()];g.plan={...planOf({}),kind:'habit',start:dayBefore(5),end:dayBefore(-2),completionMode:'${variant==='streak'?'streak':variant==='period'?'period':'total'}',impulse:${variant==='impulse'},impulseStartedAt:new Date(Date.now()-3*86400000).toISOString(),tasks:${variant==='tasks'?"[{id:'one',title:'cuidar de mim',weekdays:[0,1,2,3,4,5,6]}]":"[]"},dailyList:${variant==='tasks'},dailyTarget:${['quantity','counter'].includes(variant)?2:'null'},dailyCounter:${variant==='counter'}};render()})()`);
  assert.equal(await js("document.querySelector('.deadline-finish').dataset.practiceDay"),await js('dayBefore(-2)'),variant+' uses the deadline despite failure');
  assert.equal(await js("document.querySelector('.deadline-finish .target-finish-number')?.textContent"),await js('fmt(targetOf(state.goals[0]))'),variant+' shows the day target, never a date');
  assert.equal(await js("document.querySelector('.deadline-finish').classList.contains('target-finish')"),true,variant+' shares the pending finish outline');
  assert.equal(await js("getComputedStyle(document.querySelector('.deadline-finish .target-finish-number')).fontSize"),'16px',variant+' shares the finish typography');
  assert.equal(await js("document.querySelectorAll('.goal-finish .finish-rays').length"),1);
  assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
  assert.equal(await js("document.querySelector('.goal').getBoundingClientRect().height"),582);
  assert.match(await js("document.querySelector('.deadline-finish').getAttribute('aria-label')"),/último dia do prazo/);
  const caption=await js("(()=>{const c=document.querySelector('.streak-caption'),a=c.firstElementChild.getBoundingClientRect(),b=c.querySelector('time').getBoundingClientRect(),r=c.getBoundingClientRect();return {left:a.left-r.left,right:r.right-b.right,line:a.top-b.top,gap:b.left-a.right,datetime:c.querySelector('time').dateTime,duplicate:document.querySelector('.dream-date-slot').textContent.trim()}})()");
  assert.ok(Math.abs(caption.left)<1&&Math.abs(caption.right)<1&&Math.abs(caption.line)<1&&caption.gap>=7,variant+' caption must fit one line, aligned left and right: '+JSON.stringify(caption));
  assert.equal(caption.datetime,await js('planOf(state.goals[0]).end'));
  assert.equal(caption.duplicate,'','Deadline belongs above the grid, without a second copy below');
  await js('document.fonts.ready');
  const card=await js("(()=>{const r=document.querySelector('.goal').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
  await writeFile('/tmp/streak-deadline-'+variant+'-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:card,captureBeyondViewport:true})).data,'base64'));
 }
 // The finish retains the total rather than reverting to a check or cross.
 for(const status of ['success','failure']){
  await js(`(()=>{const g=state.goals[0];g.plan={...planOf({}),kind:'habit',completionMode:'period',start:dayBefore(5),end:today()};g.days=${status==='success'?"[today()]":"[]"};g.failures=${status==='failure'?"[today()]":"[]"};render()})()`);
  assert.equal(await js("document.querySelector('.deadline-finish .target-finish-number').textContent"),await js('fmt(targetOf(state.goals[0]))'),status+' retains the final day count');
 }
 await js("state.goals[0].plan.end=dayBefore(-2);render()");
 await js("state.goals[0].plan.impulse=false;state.goals[0].plan.weekdays=[new Date(today()+'T12:00:00').getDay()];render()");
 assert.equal(await js("document.querySelector('.deadline-finish').dataset.practiceDay"),await js('dayBefore(-2)'),'An unscheduled deadline still has its marker');
 assert.equal(await js("document.querySelector('.deadline-finish .target-finish-number').textContent"),await js('fmt(targetOf(state.goals[0]))'),'An unscheduled deadline retains its day count');
 await js("state.goals[0].plan.end=dayBefore(-20);render()");
 assert.equal(await js("document.querySelector('.deadline-finish')"),null,'A distant deadline does not displace the current grid');
}
console.log('PASS: dated deadlines across all habit variants; 5/6 finish, failure reset, skip, completion, accumulated days and fixed card at four widths');
ws.close();
