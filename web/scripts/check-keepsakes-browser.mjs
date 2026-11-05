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
 await js(`(()=>{showDemo();state.homeFilter='today';state.groups=[{id:'care',name:'Cuidados'}];const p={...planOf({}),start:dayBefore(2),weekdays:[0,1,2,3,4,5,6]};state.goals=[
 {id:'water',title:'Beber água',target:30,color:'peach',group_id:'care',days:[today()],entries:[],reward:'',plan:{...p,emoji:'💧'}},
 {id:'reading',title:'Ler um capítulo com um título que pode ocupar duas linhas',target:30,color:'sage',group_id:'care',days:[],entries:[],reward:'',plan:{...p,emoji:'📖',notes:'Um cuidado de cada vez.'}},
 {id:'care',title:'Cuidar de mim',target:30,color:'lavender',group_id:'care',days:[today()],entries:[],reward:'',plan:{...p,emoji:'🌿'}},
 {id:'amount',title:'Somar progresso',target:10,color:'peach',group_id:'care',days:[],entries:[{key:'a',day:today(),value:10}],reward:'',plan:{...p,kind:'amount',unit:'páginas',emoji:'⭐'}},
 {id:'list',title:'Minha lista',target:1,color:'sage',group_id:'care',days:[],entries:[{key:'one',day:today(),value:1}],reward:'',plan:{...p,kind:'list',items:[{id:'one',title:'Uma etapa'}],emoji:'📖'}}
 ];seedMilestones();render();document.querySelector('#demoBanner').hidden=true;document.querySelector('.mobile-chapter-link')?.click();document.querySelector('#mobileDreams').scrollTop=0;})();`);
 await js('document.fonts.ready');await new Promise(r=>setTimeout(r,250));
 assert.equal(await js("document.querySelectorAll('.keepsake').length"),5,'Habits, cumulative amounts and one-time lists get seals');
 assert.equal(await js("document.querySelector('.daily-keepsakes').textContent.trim()"),'','Symbols only, no visible copy');
 assert.equal(await js("document.querySelectorAll('.keepsake.is-done').length"),4);
 assert.equal(await js("document.querySelectorAll('.keepsake.is-pending').length"),1);
 await js("document.querySelector('[data-action=find-completed][data-id=reading]').click()");
 if(width<600)assert.ok(await js("{const c=document.querySelector('[data-goal=reading]'),g=c.closest('.goal-grid');Math.abs(c.getBoundingClientRect().left-g.getBoundingClientRect().left)<2}"),'Pending outline also links to its card');
 await js("document.querySelector('[data-action=find-completed][data-id=water]').click()");
 assert.equal(await js("document.querySelector('.volume-emblem')"),null,'Group heading has no book-cover emblem');
 const groupStyle=await js("(()=>{const g=document.querySelector('.big-dream-volume'),s=getComputedStyle(g);return {background:s.backgroundImage,border:s.borderTopColor,before:getComputedStyle(g,'::before').content,after:getComputedStyle(g,'::after').content}})()");
 assert.equal(groupStyle.background,'none');assert.equal(groupStyle.border,'rgba(0, 0, 0, 0)');assert.equal(groupStyle.before,'none');assert.equal(groupStyle.after,'none');
 assert.equal(await js("document.querySelectorAll('.keepsake-rule').length"),5,'Each bookmark has an inset paper border');
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 const geometry=await js("[...document.querySelectorAll('.goal')].map(c=>({height:c.getBoundingClientRect().height,overflow:c.scrollHeight-c.clientHeight}))");
 assert.ok(geometry.every(c=>c.height===582&&c.overflow<=1),JSON.stringify({width,geometry}));
 if(width<600){
  const fit=await js("({bottom:document.querySelector('.goal').getBoundingClientRect().bottom,nav:document.querySelector('.tabs').getBoundingClientRect().top})");
  assert.ok(fit.bottom<=fit.nav,`Full first card must fit above navigation: ${JSON.stringify({width,...fit})}`);
 }
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/keepsakes-${width}.png`,Buffer.from(png.data,'base64'));
 await js("document.querySelector('[data-action=find-completed][data-id=care]').click()");
 if(width<600)assert.ok(await js("{const c=document.querySelector('[data-goal=care]'),g=c.closest('.goal-grid');Math.abs(c.getBoundingClientRect().left-g.getBoundingClientRect().left)<2}"),'Seal goes directly to matching card');
 assert.equal(await js("document.querySelector('.goal-grid').children[0].dataset.goal"),'water','Seal never reorders cards');
 await js("state.goals[2].days=[];render()");
 assert.equal(await js("document.querySelector('[data-action=find-completed][data-id=care]').classList.contains('is-pending')"),true,'Undo restores the outline in place');
 await js("state.goals[0].days=[];state.goals[3].entries=[];state.goals[4].entries=[];render()");
 assert.equal(await js("document.querySelectorAll('.keepsake.is-done').length"),0);
 assert.equal(await js("document.querySelector('[data-action=find-completed][data-id=amount]')"),null,'Pending cumulative amounts stay off the cord');
 assert.equal(await js("document.querySelector('[data-action=find-completed][data-id=list]')"),null,'Pending one-time lists stay off the cord');
 const emptyHeight=await js("document.querySelector('.daily-keepsakes').getBoundingClientRect().height");
 await js("state.goals[0].days=[today()];render()");
 assert.equal(await js("document.querySelector('.daily-keepsakes').getBoundingClientRect().height"),emptyHeight,'First completion does not shift cards');
 await js(`state.goals=Array.from({length:100},(_,i)=>({...state.goals[0],id:'many-'+i,title:'Conquista '+i}));render()`);
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Many seals stay inside viewport');
 assert.equal(await js("document.querySelectorAll('.keepsake').length"),100);
 assert.equal(await js("document.querySelector('.daily-keepsakes').getBoundingClientRect().height"),56);
 await js("document.querySelector('.daily-keepsakes').scrollLeft=600");
 await new Promise(r=>setTimeout(r,100));
 const scrolled=await js("document.querySelector('.daily-keepsakes').scrollLeft");
 await js("state.goals[12].days=[];render()");await new Promise(r=>setTimeout(r,100));
 assert.equal(await js("document.querySelector('.daily-keepsakes').scrollLeft"),scrolled,'Recording keeps the strip position');
 await js("document.querySelector('#demoBanner').hidden=true;document.querySelector('#mobileDreams').scrollTop=0");
 if(width<600)assert.ok(await js("document.querySelector('.goal').getBoundingClientRect().bottom<=document.querySelector('.tabs').getBoundingClientRect().top"),'Dense collection keeps the full card above navigation');
 const dense=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/keepsakes-many-${width}.png`,Buffer.from(dense.data,'base64'));
 if(width<600){
  const menu=await js("({height:document.querySelector('.tabs').getBoundingClientRect().height,targets:[...document.querySelectorAll('.tabs .tab')].map(b=>b.getBoundingClientRect().height)})");
  assert.equal(menu.height,45,'Compact menu uses 45px including border');assert.ok(menu.targets.every(h=>h>=44),'Keep 44px navigation touch targets');
  await js("document.documentElement.style.setProperty('--bottom-safe-area','34px')");
  await new Promise(r=>setTimeout(r,150));
  const safe=await js("({height:document.querySelector('.tabs').getBoundingClientRect().height,navTop:document.querySelector('.tabs').getBoundingClientRect().top,workspaceBottom:document.querySelector('#mobileDreams').getBoundingClientRect().bottom})");
  assert.equal(safe.height,79,'Installed-app bottom safe area remains reserved');
  assert.ok(Math.abs(safe.workspaceBottom-safe.navTop)<2,'Chapter viewport ends above the safe-area menu: '+JSON.stringify(safe));
  await js("document.querySelector('.goal').scrollIntoView({block:'end',inline:'nearest'})");
  assert.ok(await js("document.querySelector('.goal .quick-outcomes').getBoundingClientRect().bottom<=document.querySelector('.tabs').getBoundingClientRect().top"),'Bottom card actions remain reachable above menu');
  const safeShot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/keepsakes-safe-area-${width}.png`,Buffer.from(safeShot.data,'base64'));
  await js("document.documentElement.style.removeProperty('--bottom-safe-area')");
 }
 console.log('PASS: symbol-only keepsakes, completed types, navigation, undo, fixed cards and many seals at '+width+'px');
}
await cdp('Page.close');ws.close();
