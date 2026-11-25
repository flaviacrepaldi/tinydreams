import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
await js(`showDemo();state.groups=[{id:'one',name:'Cuidados'},{id:'two',name:'Rotina'}];const p={kind:'habit',start:dayBefore(4),end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};state.goals=['Guardar grandes conquistas','Quantidade diária','Minha lista de cuidados com um título mais longo','Resistir ao impulso','Contar repetições','Outro hábito'].map((title,i)=>({id:'align'+i,title,target:30,reward:i===2?'Uma pausa para mim':'',color:['sage','peach','lavender'][i%3],created_at:new Date().toISOString(),group_id:i<4?'one':'two',days:[dayBefore(1)],failures:[],entries:[],plan:{...p,notes:i===2?'Uma observação sobre os cuidados.':'',impulse:i===3,support:i===3?'Meu combinado para atravessar a vontade.':'',impulseStartedAt:i===3?new Date(Date.now()-183845000).toISOString():undefined,dailyTarget:i===1?2:i===4?3:null,dailyCounter:i===4,unit:i===1?'litros':'',dailyList:i===2,tasks:i===2?[{id:'a',title:'Cuidar de mim',weekdays:p.weekdays}]:[]}}));state.goals.push({id:'amount-check',title:'somar 10K em investimentos',target:10000,reward:'',color:'peach',days:[],failures:[],group_id:'two',created_at:new Date().toISOString(),entries:[{key:'a',day:dayBefore(3),value:100},{key:'b',day:dayBefore(1),value:200}],plan:{...p,kind:'amount',unit:'R$'}},{id:'list-check',title:'Meus livros',target:2,reward:'',color:'sage',days:[],failures:[],entries:[],group_id:'two',created_at:new Date().toISOString(),plan:{...p,kind:'list',items:[{id:'one',title:'Um livro'},{id:'two',title:'Outro livro'}]}});state.goals.forEach((g,i)=>g.reward=i%2?'Um dia tranquilo para ler, descansar e aproveitar uma recompensa que escolhi para celebrar cada cuidado e cada pequeno passo no meu caminho. '.repeat(2).slice(0,160):'renovar meu kindle (case, pop socket, suporte, card skin, ganchinho e cordinha fofa)');render()`);
// One-time lists show one mark per item, grouping only when needed to fit the card.
await js(`(()=>{const g=state.goals.find(g=>g.id==='list-check');g.plan.items=Array.from({length:8},(_,i)=>({id:'item-'+i,title:'Item '+(i+1)}));g.entries=[{key:'item-1',day:today(),value:1}];render()})()`);
assert.deepEqual(await js(`(()=>{const c=document.querySelector('[data-goal="list-check"]');return {cells:c.querySelectorAll('.list-item-grid li').length,done:c.querySelectorAll('.list-item-grid .success').length,label:c.querySelectorAll('.list-item-grid li')[1].getAttribute('aria-label')}})()`),{cells:8,done:1,label:'Item 2: concluído'});
assert.deepEqual(await js(`(()=>{const g=state.goals.find(g=>g.id==='list-check'),items=Array.from({length:30},(_,i)=>({id:'big-'+i,title:'Item '+i})),host=document.createElement('div');host.innerHTML=listItemGrid({...g,plan:{...g.plan,items},entries:[{key:'big-0'}]});return {cells:host.querySelectorAll('li').length,partial:!!host.querySelector('.is-partial svg'),fill:host.querySelector('.is-partial')?.style.getPropertyValue('--partial-progress'),caption:host.querySelector('.streak-caption').textContent}})()`),{cells:14,partial:true,fill:'50%',caption:'itens agrupados'});
// A record of three days used to add a second star/count beside the streak phrase.
assert.equal(await js(`(()=>{const g={...state.goals[0],days:[dayBefore(2),dayBefore(1),today()]};return rewardSequence(g).best>=3&&!habitStreakGrid(g).includes('reward-record')&&habitStreakGrid(g).includes('3 dias sem falhar')})()`),true,'Keep only the streak phrase when a historical record exists');
assert.equal(await js(`(()=>{const g={...state.goals[3],plan:{...state.goals[3].plan,impulseStartedAt:new Date(Date.now()-4*86400000).toISOString()}};return rewardSequence(g).best>=3&&!habitStreakGrid(g).includes('reward-record')&&habitStreakGrid(g).includes('dias completos')})()`),true,'Impulse cards also omit the duplicate star/count');
// Partial daily work remains visible for past and current task and quantity habits.
assert.deepEqual(await js(`(()=>{const base=state.goals[0],day=dayBefore(1),p={...base.plan,start:dayBefore(4)},renderCell=g=>{const host=document.createElement('div');host.innerHTML=habitStreakGrid(g);const cell=host.querySelector('[data-practice-day="'+day+'"]');return {partial:!!cell.querySelector('.is-partial svg,svg')&&cell.classList.contains('is-partial'),label:cell.getAttribute('aria-label'),success:cell.classList.contains('success'),fill:cell.style.getPropertyValue('--partial-progress')}};const tasks={...base,days:[],entries:[{key:day+':a',day,value:1}],plan:{...p,tasks:[{id:'a',weekdays:p.weekdays},{id:'b',weekdays:p.weekdays}],dailyList:true}},quantity={...base,days:[],entries:[{key:'q',day,value:0.5}],plan:{...p,dailyTarget:2}},done={...quantity,days:[day],entries:[{key:'q',day,value:2}]};return [renderCell(tasks),renderCell(quantity),renderCell(done)]})()`),[{partial:true,label:await js("prettyDay(dayBefore(1))+': falha · 1/2 concluído'"),success:false,fill:'50%'},{partial:true,label:await js("prettyDay(dayBefore(1))+': falha · 0,5/2 concluído'"),success:false,fill:'25%'},{partial:false,label:await js("prettyDay(dayBefore(1))+': cumprido'"),success:true,fill:''}]);
// Pointer hover and programmatic focus must not paint a selection state.
await cdp('DOM.enable');await cdp('CSS.enable');
await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:844,deviceScaleFactor:1,mobile:false});
await js('document.fonts.ready');
const {root}=await cdp('DOM.getDocument');
for(const selector of ['#newGoalButton','.goal .small-button','.goal .check-button','.keepsake','.home-filter button']){
 const {nodeId}=await cdp('DOM.querySelector',{nodeId:root.nodeId,selector});
 assert.ok(nodeId,`Missing pointer regression target: ${selector}`);
 const paint=()=>js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(el);return [s.backgroundColor,s.color,s.borderColor,s.transform,s.boxShadow,s.outlineStyle]})()`);
 await cdp('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});const baseline=await paint();
 await cdp('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});
 await new Promise(r=>setTimeout(r,250));
 assert.deepEqual(await paint(),baseline,`Hover paints selection: ${selector}`);
 await cdp('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['focus','focus-visible']});
 assert.equal((await paint()).at(-1),'none',`Focus ring remains: ${selector}`);
 await cdp('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
}
assert.equal(await js("document.querySelectorAll('.dream-group:not([hidden])').length"),1,'One Big Dream is visible');
await js("document.querySelector('[data-action=select-dream-group][data-group=two]').click()");
assert.equal(await js("document.querySelector('.dream-group:not([hidden]) h2').textContent"),'Rotina','Selecting a Big Dream shows its cards');
assert.equal(await js("document.querySelector('[data-action=select-dream-group][data-group=two]').getAttribute('aria-pressed')"),'true');
await js("document.querySelector('[data-action=select-dream-group][data-group=one]').click()");
for(const width of [320,390,430,1280]){
 await js("renderOverview()");
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');if(width<600)await js("document.querySelector('.mobile-chapter-link')?.click()");await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 if(width<600){
  await js("document.querySelector('#demoBanner').hidden=true;document.querySelector('#mobileDreams').scrollTop=0");
  const headerFit=await js("(()=>{const card=document.querySelector('.goal').getBoundingClientRect(),nav=document.querySelector('.tabs').getBoundingClientRect(),logo=document.querySelector('.overview-mobile-brand .brand-monogram').getBoundingClientRect();return {cardBottom:card.bottom,menuTop:nav.top,logoWidth:logo.width}})()");
  assert.equal(headerFit.logoWidth,38);
  assert.ok(headerFit.cardBottom<=headerFit.menuTop,`Header pushes first card under menu: ${JSON.stringify({width,...headerFit})}`);
  if(width===390){const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/big-dream-header-390.png',Buffer.from(png.data,'base64'))}
 }
 await js("document.querySelector('[data-action=select-dream-group][data-group=two]').click()");
 assert.equal(await js("document.querySelector('.dream-group:not([hidden]) h2').textContent"),'Rotina');
 await js("(()=>{window.savedAmountEntries=state.goals.find(g=>g.id==='amount-check').entries;const amount=state.goals.find(g=>g.id==='amount-check');amount.entries=[];amount.plan.initialAmount=250;amount.plan.end=dayBefore(-10);renderOverview()})()");
 assert.equal(await js("!!document.querySelector('[data-goal=amount-check] .amount-trend')"),true,'Amount card shows a chart with only a starting value and a deadline');
 assert.equal(await js("document.querySelector('[data-goal=amount-check] .amount-trend').getAttribute('aria-label').includes('250')"),true,'Chart includes the starting value');
 assert.equal(await js("!!document.querySelector('[data-goal=amount-check] .amount-trend-projection' )"),false,'No rate is invented without deposits');
 await js("(()=>{const amount=state.goals.find(g=>g.id==='amount-check');amount.entries=window.savedAmountEntries;amount.plan.end='';amount.plan.initialAmount=0;renderOverview()})()");
 assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false,'Tabs must not overflow the page');
 const navigationScreenshot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/big-dream-tabs-${width}.png`,Buffer.from(navigationScreenshot.data,'base64'));
 await js("document.querySelector('[data-action=select-dream-group][data-group=one]').click()");
 await js("document.querySelectorAll('.dream-group[hidden]').forEach(group=>group.hidden=false)");
 const offsets=await js(`(()=>{const cards=[...document.querySelectorAll('.goal')];return cards.map(card=>{const r=card.getBoundingClientRect(),grid=(card.querySelector('.streak-grid')||card.querySelector('.dream-progress')).getBoundingClientRect();const summary=card.querySelector('.dream-summary'),sr=summary.getBoundingClientRect(),last=card.lastElementChild.getBoundingClientRect(),contentBottom=Math.max(...[...summary.children].map(el=>el.getBoundingClientRect().bottom));return {kind:card.dataset.goalKind,hasGrid:!!card.querySelector('.streak-grid'),title:card.querySelector('h2').textContent,grid:grid.top-r.top,width:card.clientWidth,scroll:card.scrollWidth,height:r.height,verticalOverflow:card.scrollHeight-card.clientHeight,summaryWaste:sr.bottom-contentBottom,footerWaste:r.bottom-last.bottom,gridGap:grid.top-sr.bottom}})})()`);
 assert.ok(Math.max(...offsets.filter(v=>v.hasGrid).map(v=>v.grid))-Math.min(...offsets.filter(v=>v.hasGrid).map(v=>v.grid))<2,JSON.stringify({width,offsets}));
 assert.ok(offsets.every(v=>v.scroll<=v.width+1),JSON.stringify({width,offsets}));
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 assert.equal(await js("document.querySelectorAll('.streak-caption small,.streak-key,.streak-routine').length"),0,'Home cards omit explanatory legends');
 assert.equal(await js("document.querySelector('.goal [data-action=annotate]')"),null);
 assert.equal(await js("document.querySelector('[data-goal=align3] .dream-summary-subtitle').textContent"),'Meu combinado para atravessar a vontade.');
 const rewardBoxes=await js("[...document.querySelectorAll('.goal')].map(c=>{const r=c.querySelector('.reward').getBoundingClientRect(),n=c.querySelector('.reward-name').getBoundingClientRect(),b=c.querySelector('.quick-outcomes,.plan-open').getBoundingClientRect();return {fits:n.top>=r.top-1&&n.bottom<=r.bottom+1,overlap:r.bottom-b.top}})");
 assert.ok(rewardBoxes.every(v=>v.fits&&v.overlap<=-2),`Reward clips or overlaps actions: ${JSON.stringify(rewardBoxes)}`);
 const circles=await js("[...document.querySelectorAll('.streak-square')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,radius:getComputedStyle(e).borderRadius}})");
 assert.ok(circles.every(c=>Math.abs(c.width-c.height)<1&&c.width<=40.1&&c.radius==='50%'),`Streak days are not circles: ${JSON.stringify(circles)}`);
 const artLayout=await js("[...document.querySelectorAll('.goal')].map(c=>{const a=c.querySelector('.amulet-frame').getBoundingClientRect(),t=c.querySelector('.countdown').getBoundingClientRect(),d=c.querySelector('.dream-daily-slot').getBoundingClientRect();return {w:a.width,h:a.height,gap:a.left-t.right,bottom:a.bottom-d.top}})");
 assert.ok(artLayout.every(v=>v.w===116&&v.h===124&&v.gap>=-1&&v.bottom<=-7),`Amulet overlap: ${JSON.stringify(artLayout)}`);
 const menuIcons=await js("[...document.querySelectorAll('.goal-menu button')].map(b=>{const r=b.getBoundingClientRect(),i=b.querySelector('svg').getBoundingClientRect(),s=getComputedStyle(b);return {w:r.width,h:r.height,iw:i.width,ih:i.height,bg:s.backgroundColor,radius:s.borderRadius}})");
 assert.ok(menuIcons.length>0&&menuIcons.every(b=>b.w===36&&b.h===36&&b.iw===18&&b.ih===18&&b.bg==='rgba(0, 0, 0, 0)'&&b.radius==='50%'),'Card icon controls must have matching circles and glyphs: '+JSON.stringify(menuIcons));
 const titleGaps=await js("[...document.querySelectorAll('.goal')].map(c=>{const t=c.querySelector('h2'),s=c.querySelector('.dream-summary-subtitle');return {gap:s.getBoundingClientRect().top-t.getBoundingClientRect().bottom,size:parseFloat(getComputedStyle(t).fontSize),line:parseFloat(getComputedStyle(t).lineHeight),inset:parseFloat(getComputedStyle(t).paddingLeft)}})");
 assert.ok(titleGaps.every(v=>v.gap>=0&&v.gap<=3&&v.size===24&&v.line>=28&&v.inset>=2),JSON.stringify(titleGaps));
 const geometry=await js("[...document.querySelectorAll('.goal')].map(c=>{const r=c.getBoundingClientRect();return {height:r.height,title:c.querySelector('h2').getBoundingClientRect().top-r.top,subtitle:c.querySelector('.dream-summary-subtitle').getBoundingClientRect().top-r.top,progress:c.querySelector('.dream-progress').getBoundingClientRect().top-r.top}})");
 for(const key of ['height','title','progress'])assert.ok(Math.max(...geometry.map(v=>v[key]))-Math.min(...geometry.map(v=>v[key]))<2,`Inconsistent ${key}: ${JSON.stringify(geometry)}`);

 if(width<600){
  for(const metric of offsets){
   assert.equal(Math.round(metric.height),582,`Cards must keep the shared compact height: ${JSON.stringify(metric)}`);
   assert.ok(metric.height<=740,`Card too tall: ${JSON.stringify({width,...metric})}`);
   assert.ok(metric.verticalOverflow<=1,`Internal card scroll: ${JSON.stringify(metric)}`);
   assert.ok(metric.footerWaste<=20,`Empty footer space: ${JSON.stringify(metric)}`);
   assert.ok(metric.summaryWaste<=96,`Empty summary space: ${JSON.stringify(metric)}`);
   assert.ok(!metric.hasGrid||metric.gridGap<=62,`Empty gap above streak: ${JSON.stringify(metric)}`);
  }
 }

 if(width<600){
  const count=await js("document.querySelectorAll('.goal').length");
  for(let i=0;i<count;i++){
   await js(`(()=>{const c=document.querySelectorAll('.goal')[${i}],g=c.closest('.goal-grid');g.scrollLeft=c.offsetLeft-g.firstElementChild.offsetLeft;fitGalleryViewport(g)})()`);
   const waste=await js(`(()=>{const c=document.querySelectorAll('.goal')[${i}],g=c.closest('.goal-grid'),s=getComputedStyle(g);return g.getBoundingClientRect().height-c.getBoundingClientRect().height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)})()`);
   assert.ok(Math.abs(waste)<=2,`Carousel empty space: ${waste}`);
   if(width===390){await js(`document.querySelectorAll('.goal')[${i}].scrollIntoView({block:'start',inline:'start'})`);const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/streak-card-${i}.png`,Buffer.from(png.data,'base64'))}
  }
 }
 if(width<600){
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});
  await js("document.querySelector('.mobile-chapter-link')?.click()");
  await new Promise(r=>setTimeout(r,600));
  const selector='.goal-grid';
  await js(`(()=>{const g=document.querySelector('${selector}');g.scrollLeft=0;fitGalleryViewport(g);g.scrollIntoView({block:'start'});window.beforeSwipeHeight=g.getBoundingClientRect().height})()`);
  await new Promise(r=>setTimeout(r,300));
  for(const [direction,expected] of [[-1,1],[-1,2],[1,1]]){
   if(direction===-1&&expected===2){
    await js("changeEntry('align1',{key:'qa-daily',day:today(),value:2,done:true},false)");await wait('!state.busy');
    await js('dismissMilestone()');
    assert.equal(await js("dayDone(state.goals.find(g=>g.id==='align1'),today())"),true);
    assert.equal(await js("document.querySelector('.goal-grid').children[1].dataset.goal"),'align1','Completion preserves order');
   }
   if(direction===1){
    await js("changeEntry('align2',{key:today()+':a',day:today(),value:1,done:true},false)");await wait('!state.busy');await js('dismissMilestone()');
   }
   const box=await js(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.left,w:r.width,y:Math.max(80,r.top+70)}})()`);
   const start=box.x+box.w*(direction<0?.85:.15),end=box.x+box.w*(direction<0?.15:.85);
   await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y:box.y}]});
   for(let step=1;step<=8;step++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*step/8,y:box.y}]});await new Promise(r=>setTimeout(r,25))}
   await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await new Promise(r=>setTimeout(r,800));
   const result=await js(`(()=>{const g=document.querySelector('${selector}'),cards=[...g.children],left=g.getBoundingClientRect().left,c=cards.reduce((a,b)=>Math.abs(a.getBoundingClientRect().left-left)<Math.abs(b.getBoundingClientRect().left-left)?a:b);return {index:cards.indexOf(c),delta:Math.abs(c.getBoundingClientRect().left-left)}})()`);
   assert.equal(await js("document.querySelector('.goal-grid').getBoundingClientRect().height===window.beforeSwipeHeight"),true,'Gallery height changed after swipe');
   assert.equal(result.index,expected,`Swipe skipped or stuck at ${width}px: ${JSON.stringify(result)}`);
   assert.ok(result.delta<2,`Swipe stopped between cards: ${JSON.stringify(result)}`);
  }
 }
 await js("document.querySelector('.goal-grid').scrollLeft=0;fitGalleryViewport(document.querySelector('.goal-grid'));document.querySelector('.goal-grid').scrollIntoView({block:'center'})");
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/streak-alignment-${width}.png`,Buffer.from(png.data,'base64'));
 console.log('PASS: compact cards without overflow or empty tails; aligned streaks across habits, amount and list goals in two groups at '+width+'px');
}
await js("openDetails('amount-check');document.querySelector('.detail-reward').scrollIntoView({block:'center'})");
assert.equal(await js("document.querySelector('.detail-reward p').textContent"),await js("state.goals.find(g=>g.id==='amount-check').reward"));
await js("document.querySelector('#progressDialog').close()");
ws.close();
