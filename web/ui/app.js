'use strict';
const $=s=>document.querySelector(s);
const state={goals:[],groups:[],realGroups:[],view:'dreams',homeFilter:'today',demo:false,real:[],month:new Date().getMonth(),year:new Date().getFullYear(),calendarGoal:'all',busy:false};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateFrom=s=>new Date(s+'T12:00:00');
const dayBefore=n=>{const d=dateFrom(today());d.setDate(d.getDate()-n);return localDay(d)};
const localDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={book:'<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',leaf:'<path d="M19 4C8 3 3 9 6 15s13 4 13-11Z"/><path d="m5 21 10-12"/>',star:'<path d="m12 3 2.7 5.7L21 10l-4.6 4.4 1.1 6.3L12 17.5l-5.5 3.2 1.1-6.3L3 10l6.3-1.3Z"/>',gift:'<rect x="4" y="10" width="16" height="11" rx="1"/><path d="M3 6h18v4H3zM12 6v15M12 6C4 7 4 0 8 3l4 3Zm0 0c8 1 8-6 4-3l-4 3Z"/>',check:'<path d="m5 12 4 4L19 6"/>',edit:'<path d="m4 16-1 5 5-1L20 8l-4-4L4 16ZM14 6l4 4"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.star}</svg>`;
const streak=g=>{let n=0;const start=planOf(g).start;for(let i=0;i<36501;i++){const day=dayBefore(i);if(start&&day<start)break;if(!scheduled(g,day))continue;if(g.days.includes(day))n++;else if(i!==0||outcomeOf(g,day)==='failure')break}return n};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3800)}
async function api(path='',method='GET',body){
 const attempts=method==='GET'?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  let r;
  try{r=await fetch('/api/goals'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)})}
  catch(error){if(attempt+1<attempts){await new Promise(resolve=>setTimeout(resolve,500));continue}throw Error('Não foi possível conectar agora. Tente novamente.')}
  if(r.status>=500&&attempt+1<attempts){await new Promise(resolve=>setTimeout(resolve,500));continue}
  let data;try{data=await r.json()}catch{throw Error('Não foi possível carregar seus sonhos. Tente novamente.')}
  if(!r.ok)throw Error(data.error||'Não foi possível salvar. Tente novamente.');
  return data;
 }
}
async function load(){resetMilestonePanel();state.busy=true;$('#loading').hidden=false;$('#errorPanel').hidden=true;$('#content').innerHTML='';try{const [goals,groups]=await Promise.all([api(),api('/groups')]);state.real=goals;state.goals=goals;state.realGroups=groups;state.groups=groups;state.demo=false;seedMilestones();render()}catch(e){$('#errorText').textContent=e.message;$('#errorPanel').hidden=false}finally{state.busy=false;$('#loading').hidden=true;checkIncompleteNotice()}}
function demoGoals(){return [{id:'demo-read',title:'Ler antes de dormir',reward:'Um livro novo, escolhido sem pressa',target:21,color:'lavender',days:Array.from({length:8},(_,i)=>dayBefore(i+1)),redeemed:0},{id:'demo-move',title:'Movimentar meu corpo',reward:'Uma massagem só para mim',target:15,color:'peach',days:[0,1,2,4,5,7,8,9,10,11].map(dayBefore),redeemed:0},{id:'demo-pause',title:'Um momento só meu',reward:'Um café da manhã bem especial',target:10,color:'sage',days:[1,2,3,4,5,6].map(dayBefore),redeemed:0}]}
function showDemo(){$('#incompleteReviewDialog')?.close();resetMilestonePanel();state.demo=true;state.goals=demoGoals();state.groups=[];seedMilestones();render()}
window.addEventListener('resize',()=>requestAnimationFrame(alignDreamSummaries),{passive:true});
document.fonts?.ready.then(alignDreamSummaries);
function homeStatus(g){return planOf(g).kind!=='habit'?0:dayDone(g,today())?1:scheduled(g,today())?0:2}
function visibleOnHome(g){return !isArchivedIncomplete(g)&&(!planOf(g).start||planOf(g).start<=today())&&(!complete(g)||[1,-1].includes(daysUntil(completionDay(g),today())))}
function dailyStateBadge(g){
 if(complete(g))return `<span class="daily-state">${completionDay(g)===today()?'realizado hoje':'realizado ontem'}</span>`;
 if(planOf(g).impulse)return '';
 if(isArchivedIncomplete(g))return '<span class="daily-state">encerrado sem concluir</span>';
 if(planOf(g).kind!=='habit')return '';
 const status=homeStatus(g);
 return `<span class="daily-state ${status===1?'daily-state-done':status===2?'daily-state-rest':'daily-state-pending'}">${status===1?icon('check'):''}${outcomeOf(g,today())==='skipped'?'dia pulado':status===1?'feito hoje':status===2?'sem atividade hoje':'pendente hoje'}</span>`;
}
function render(){
 const gs=state.goals;document.body.dataset.view=state.view;
 $('#demoBanner').hidden=!state.demo;$('#goalsCount').textContent=gs.filter(g=>visibleOnHome(g)&&!complete(g)&&homeStatus(g)===0).length;
 document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(state.view==='analytics')renderAnalytics();else if(state.view==='shelf')renderShelf();else if(state.view==='today')renderToday();else if(state.view==='calendar')renderCalendar();else renderOverview();
 if($('#incompleteDialog')?.open)renderIncompleteCollection();
 queueMicrotask(checkIncompleteNotice);
}
function completedToday(g){
 return planOf(g).kind==='habit'?dayDone(g,today()):complete(g)&&completionDay(g)===today();
}
function dailyKeepsakes(goals){
 goals=goals.filter(g=>planOf(g).kind==='habit'||completedToday(g));
 if(!goals.length)return '';
 return `<nav class="daily-keepsakes ${rewardAllToday()?'all-complete':''}" aria-label="Tydreams de hoje"><div class="keepsake-line"><svg class="keepsake-cord" viewBox="0 0 400 18" preserveAspectRatio="none" aria-hidden="true"><path d="M1 3 Q200 25 399 3"/></svg>${goals.map(g=>`<button type="button" class="keepsake ${completedToday(g)?'is-done':'is-pending'}" data-action="find-completed" data-id="${esc(g.id)}" aria-label="Ver ${esc(g.title)}, ${completedToday(g)?'concluído hoje':'pendente'}" title="${esc(g.title)}">${goalEmoji(g)}<svg class="keepsake-rule" viewBox="0 0 42 43" fill="none" aria-hidden="true"><path d="M4 5H38V37L21 31 4 37Z"/></svg><span class="keepsake-leaf" aria-hidden="true">${icon('leaf')}</span></button>`).join('')}</div></nav>`;
}
function orderedGroupGoals(goals,group){
 const order=group?.goalOrder||[];
 return goals.slice().sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length:ai)-(bi<0?order.length:bi)});
}
function renderOverview(){
 const keepsakeLeft=document.querySelector('.daily-keepsakes')?.scrollLeft||0;
 const positions=[...document.querySelectorAll('.dream-overview .goal-grid')].map(grid=>{
  const left=grid.getBoundingClientRect().left,cards=[...grid.querySelectorAll(':scope > .goal')];
  const card=cards.reduce((best,item)=>!best||Math.abs(item.getBoundingClientRect().left-left)<Math.abs(best.getBoundingClientRect().left-left)?item:best,null);
  return card?{id:card.dataset.goal}:null;
 }).filter(Boolean);
 const active=state.goals.filter(g=>visibleOnHome(g)&&(state.homeFilter==='all'||complete(g)||planOf(g).kind!=='habit'||scheduled(g,today())||dayDone(g,today())));
 const section=(name,goals,group)=>{
  goals=orderedGroupGoals(goals,group);
  const members=group?state.goals.filter(g=>g.group_id===group.id):state.goals.filter(g=>!state.groups.some(group=>group.id===g.group_id)),finished=members.filter(complete).length;
  const planned=members.filter(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&(!complete(g)||dayDone(g,today()))),done=planned.filter(g=>dayDone(g,today())).length;
  return `<section class="dream-group ${group?'big-dream-volume':''}"><div class="group-heading"><div class="volume-title"><h2>${esc(name)}</h2><p>${group?`${members.length} ${members.length===1?'tydream':'tydreams'} · ${finished} ${finished===1?'realizado':'realizados'}`:`${goals.length} ${goals.length===1?'tydream em andamento':'tydreams em andamento'}`}</p>${planned.length?`<p class="group-today-progress">${done} de ${planned.length} feitos hoje</p>`:''}</div>${group?`<button class="text-button rename-group-button" data-action="edit-group" data-group="${esc(group.id)}" aria-label="ajustes do big dream ${esc(name)}" title="ajustes do big dream">${icon('edit')}</button>`:''}</div>${goals.length?`<div class="goal-grid" tabindex="0" role="region" aria-label="Tydreams de ${esc(name)}">${goals.map(goalCard).join('')}</div>`:`<p class="group-empty">${members.length?(state.homeFilter==='all'?'nenhum tydream pendente neste grupo. consulte seus registros em hoje ou calendário.':'nenhum tiny dream para hoje neste grupo.'):'Escolha este Big Dream ao criar ou editar um tiny dream.'}</p>`}</section>`;
 };
 const ungrouped=active.filter(g=>!state.groups.some(group=>group.id===g.group_id));
 $('#content').innerHTML=`<div class="dream-overview"><div class="overview-tools"><h2><span class="overview-desktop-title">Big Dreams</span><span class="overview-mobile-brand"><svg class="brand-monogram" viewBox="0 0 128 136" aria-hidden="true">${document.querySelector('.topbar .brand-monogram')?.innerHTML||''}</svg><span>tiny dreams<span class="brand-dot">.</span></span></span></h2><div class="home-filter" role="group" aria-label="mostrar tiny dreams"><button type="button" data-action="home-filter" data-filter="today" aria-pressed="${state.homeFilter!=='all'}">hoje</button><button type="button" data-action="home-filter" data-filter="all" aria-pressed="${state.homeFilter==='all'}">todos</button></div><button class="icon-button new-group-button" data-action="new-group" aria-label="novo big dream" title="novo big dream"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>${dailyKeepsakes(active)}${!state.goals.length&&!state.groups.length?`<div class="empty"><h2>Seu próximo capítulo começa aqui.</h2><p>Crie seu primeiro tydream ou um Big Dream para reunir seus sonhos.</p><div class="empty-actions"><button class="primary" data-action="new">criar meu primeiro tiny dream</button><button class="text-button" data-action="demo">Explorar um exemplo</button></div></div>`:`${state.groups.map(group=>section(group.name,active.filter(g=>g.group_id===group.id),group)).join('')}${ungrouped.length?section(state.groups.length?'sem big dream':'meus tydreams',ungrouped):''}${!active.length&&state.goals.length&&!state.groups.length?`<p class="muted">${state.homeFilter==='all'?'nenhum tydream pendente. consulte seus registros em hoje ou calendário.':'nenhum tiny dream para hoje. selecione todos para ver os demais.'}</p>`:''}<button class="secondary overview-add" data-action="new">novo tiny dream</button>`}</div>`;
 fitDreamGalleries();
 const strip=document.querySelector('.daily-keepsakes');
 if(strip){strip.scrollLeft=keepsakeLeft;const edges=()=>{strip.dataset.before=String(strip.scrollLeft>2);strip.dataset.after=String(strip.scrollWidth-strip.clientWidth-strip.scrollLeft>2)};strip.addEventListener('scroll',edges,{passive:true});requestAnimationFrame(edges)}
 if(window.matchMedia('(max-width:560px)').matches)for(const position of positions){
  const card=[...document.querySelectorAll('.dream-overview .goal')].find(card=>card.dataset.goal===position.id);
  if(!card)continue;
  const grid=card.closest('.goal-grid');
  grid.style.scrollSnapType='none';
  const restore=()=>grid.scrollTo({left:card.offsetLeft-grid.firstElementChild.offsetLeft,behavior:'instant'});
  restore();requestAnimationFrame(()=>{restore();grid.style.removeProperty('scroll-snap-type')});
 }
 requestAnimationFrame(fitAmountTrends);
}
document.addEventListener('click',event=>{
 const seal=event.target.closest('[data-action="find-completed"]');if(!seal)return;
 const card=[...document.querySelectorAll('.dream-overview .goal')].find(card=>card.dataset.goal===seal.dataset.id);
 if(!card)return;
 const grid=card.closest('.goal-grid');
 card.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 if(window.matchMedia('(max-width:560px)').matches)grid.scrollTo({left:card.offsetLeft-grid.firstElementChild.offsetLeft,behavior:'instant'});
 card.querySelector('.diary-button')?.focus({preventScroll:true});
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action="home-filter"]');if(!button)return;
 state.homeFilter=button.dataset.filter==='all'?'all':'today';renderOverview();
 document.querySelector(`[data-action="home-filter"][data-filter="${state.homeFilter}"]`)?.focus({preventScroll:true});
});
function alignDreamSummaries(){
 const overview=document.querySelector('.dream-overview');if(!overview)return;
 overview.querySelectorAll('.goal-grid').forEach(fitGalleryViewport);
}
function fitGalleryViewport(grid){
 // Every card is present at full height before the gesture begins.
 grid.style.removeProperty('height');
}
function fitDreamGalleries(){
 alignDreamSummaries();
 const mobile=window.matchMedia('(max-width:560px)');
 document.querySelectorAll('.dream-overview .goal-grid').forEach(grid=>{
  const cards=[...grid.querySelectorAll(':scope > .goal')];if(!cards.length)return;
  grid.style.removeProperty('height');
  let touching=false,settleTimer,gesture=null;
  const atEnd=()=>grid.scrollWidth-grid.clientWidth-grid.scrollLeft<=4||cards.at(-1).getBoundingClientRect().right<=grid.getBoundingClientRect().right+4;
  let wrapping=false;
  const wrap=()=>{
   clearTimeout(settleTimer);
   wrapping=true;
   grid.scrollTo({left:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
   setTimeout(()=>{wrapping=false;settle()},700);
  };
  const settle=()=>{
   clearTimeout(settleTimer);if(touching||wrapping||!grid.isConnected)return;
   // Native snap owns the horizontal position. Resize only once movement ends.
   fitGalleryViewport(grid);
  };
  const scheduleSettle=()=>{clearTimeout(settleTimer);settleTimer=setTimeout(settle,220)};
  fitGalleryViewport(grid);
  grid.addEventListener('scroll',scheduleSettle,{passive:true});
  grid.addEventListener('scrollend',settle,{passive:true});
  grid.addEventListener('touchstart',event=>{
   touching=true;clearTimeout(settleTimer);
   const touch=event.touches.length===1?event.touches[0]:null;
   gesture=touch?{id:touch.identifier,x:touch.clientX,y:touch.clientY,atEnd:atEnd()}:null;
  },{passive:true});
  grid.addEventListener('touchmove',event=>{
   if(!mobile.matches||cards.length<2||!gesture||event.touches.length!==1||!gesture.atEnd)return;
   const touch=event.touches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
   // Only claim an outward horizontal gesture; vertical page scrolling stays native.
   if(dx < -8&&Math.abs(dx)>Math.abs(dy)*1.3){
    if(event.cancelable)event.preventDefault();
    gesture.forward=dx < -35;
   }else gesture.forward=false;
  },{passive:false});
  grid.addEventListener('touchend',event=>{
   if(event.touches.length)return;
   touching=false;
   const touch=gesture&&[...event.changedTouches].find(t=>t.identifier===gesture.id);
   if(mobile.matches&&cards.length>1&&gesture?.atEnd&&touch){
    const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
    if((gesture.forward||dx < -35)&&Math.abs(dx)>Math.abs(dy)*1.3){wrap()}
   }
   gesture=null;scheduleSettle();
  },{passive:true});
  grid.addEventListener('touchcancel',()=>{touching=false;gesture=null;scheduleSettle()},{passive:true});
  grid.addEventListener('keydown',event=>{
   if(event.target===grid&&mobile.matches&&cards.length>1&&event.key==='ArrowRight'&&atEnd()){event.preventDefault();wrap()}
  });
 });
}
function renderGroupOrder(ids){
 $('#groupOrder').innerHTML=ids.map((id,i)=>{const g=state.goals.find(g=>g.id===id);return `<div class="group-order-row" data-id="${esc(id)}"><span>${esc(g.title)}</span><button type="button" class="icon-button" data-move="-1" aria-label="Subir ${esc(g.title)}" ${i===0?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></button><button type="button" class="icon-button" data-move="1" aria-label="Descer ${esc(g.title)}" ${i===ids.length-1?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg></button></div>`}).join('')||'<p class="muted">Este Big Dream ainda não tem tydreams.</p>';
}
$('#groupOrder').addEventListener('click',event=>{
 const button=event.target.closest('[data-move]');if(!button)return;
 const ids=[...$('#groupOrder').children].map(row=>row.dataset.id),id=button.closest('[data-id]').dataset.id,index=ids.indexOf(id),next=index+Number(button.dataset.move);
 if(next<0||next>=ids.length)return;
 [ids[index],ids[next]]=[ids[next],ids[index]];renderGroupOrder(ids);
 $('#groupOrder').querySelector(`[data-id="${CSS.escape(id)}"] [data-move="${button.dataset.move}"]`).focus();
});
function openGroup(id){
 const group=state.groups.find(g=>g.id===id);
 $('#groupId').value=group?.id||'';$('#groupName').value=group?.name||'';$('#groupFormTitle').textContent=group?'ajustes do big dream':'Criar um Big Dream';$('#groupError').textContent='';
 $('#groupMembers').innerHTML=state.goals.length?state.goals.map(g=>{const current=state.groups.find(group=>group.id===g.group_id);return `<label class="group-member"><input type="checkbox" value="${esc(g.id)}" ${group&&g.group_id===group.id?'checked':''}><span><strong>${esc(g.title)}</strong><small>${complete(g)?'Realizado · ':''}${current?esc(current.name):'Sem Big Dream'}</small></span></label>`}).join(''):'<p class="muted">Você pode criar o grupo agora e adicionar tydreams depois.</p>';
 $('#groupMembers').closest('fieldset').hidden=!!group;
 $('#groupOrderSection').hidden=!group;renderGroupOrder(group?orderedGroupGoals(state.goals.filter(g=>g.group_id===id),group).map(g=>g.id):[]);
 $('#saveGroup').textContent=group?'salvar alterações':'criar big dream';
 $('#deleteGroup').hidden=!group;$('#groupDeleteConfirm').hidden=true;showDialog($('#groupDialog'));
}
$('#groupForm').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy)return;
 const id=$('#groupId').value,name=$('#groupName').value.trim(),goalIds=[...document.querySelectorAll('#groupMembers input:checked')].map(input=>input.value);
 if(!name){$('#groupError').textContent='Dê um nome ao Big Dream.';return}
 if(state.groups.some(g=>g.id!==id&&g.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){$('#groupError').textContent='Já existe um Big Dream com esse nome.';return}
 state.busy=true;$('#saveGroup').disabled=true;$('#groupError').textContent='';
 try{
  const goalOrder=[...document.querySelectorAll('#groupOrder .group-order-row')].map(row=>row.dataset.id);
  const group=state.demo?{id:id||'demo-group-'+crypto.randomUUID(),name,...(id?{goalOrder}:{})}:await api('/groups'+(id?'/'+id:''),id?'PATCH':'POST',id?{name,goalOrder}:{name,goalIds});
  if(id)Object.assign(state.groups.find(g=>g.id===id),group);else state.groups.push(group);
  if(!id)for(const g of state.goals){if(goalIds.includes(g.id))g.group_id=group.id}
  if(!state.demo)state.realGroups=state.groups;
  $('#groupDialog').close();render();toast(id?'Big Dream atualizado.':'Seu Big Dream está pronto.');
 }catch(error){$('#groupError').textContent=error.message}finally{state.busy=false;$('#saveGroup').disabled=false}
});
$('#deleteGroup').addEventListener('click',()=>{$('#groupDeleteConfirm').hidden=false});
$('#confirmDeleteGroup').addEventListener('click',async()=>{
 if(state.busy)return;const id=$('#groupId').value;state.busy=true;$('#confirmDeleteGroup').disabled=true;
 try{if(!state.demo)await api('/groups/'+id,'DELETE');state.groups=state.groups.filter(g=>g.id!==id);for(const g of state.goals)if(g.group_id===id)g.group_id=null;if(!state.demo)state.realGroups=state.groups;$('#groupDialog').close();render();toast('Big Dream removido. Seus tydreams continuam em Sem Big Dream.')}catch(error){$('#groupError').textContent=error.message}finally{state.busy=false;$('#confirmDeleteGroup').disabled=false}
});
document.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(b?.dataset.action==='new-group')openGroup();if(b?.dataset.action==='edit-group')openGroup(b.dataset.group)});
function calendarEntries(day){
 const goals=state.calendarGoal==='all'?state.goals:state.goals.filter(g=>g.id===state.calendarGoal);
 return goals.map(goal=>({goal,...calendarState(goal,day,today())})).filter(entry=>entry.visible);
}
function calendarStickers(entries){
 return entries.map(({goal,done,failed,partial,status},i)=>`<span class="calendar-sticker ${done?'is-done':failed?'is-failed':partial?'is-partial':'is-planned'} ${['lavender','peach','sage'].includes(goal.color)?goal.color:'lavender'}" style="--sticker-turn:${[-7,5,-3][i%3]}deg" title="${esc(goal.title)} · ${status}">${goalEmoji(goal)}${done?`<i class="sticker-check">${icon('check')}</i>`:failed?`<i class="sticker-check">${icon('cross')}</i>`:''}</span>`).join('');
}
function calendarDayDetail(day){
 const entries=calendarEntries(day),done=entries.filter(e=>e.done),pending=entries.filter(e=>!e.done),summary=calendarSummary(entries,day,today());
 const heading=dateFrom(day).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
 const row=({goal,status,done,failed,partial})=>`<button type="button" class="calendar-agenda-item" data-calendar-goal="${goal.id}" data-day="${day}"><span class="agenda-sticker" aria-hidden="true">${calendarStickers([{goal,status,done,failed,partial}])}</span><span><strong data-user-content>${esc(goal.title)}</strong><small>${status}</small></span>${day<=today()?icon('chevronRight'):''}</button>`;
 return `<section class="calendar-selected-day" aria-labelledby="selectedDayTitle"><h3 id="selectedDayTitle">${heading}</h3><p class="calendar-day-summary">${day>today()?`${summary.total} previstos para este dia`:summary.total?`${summary.completed} de ${summary.total} concluídos · ${summary.percent}%`:'nenhum sonho previsto para este dia'}</p>${done.length?`<div class="calendar-achievements">${done.map(({goal,...entry})=>`<button type="button" class="calendar-achievement" data-calendar-goal="${goal.id}" data-day="${day}" aria-label="${esc(goal.title)} · feito · abrir registro"><span aria-hidden="true">${calendarStickers([{goal,...entry}])}</span><strong data-user-content>${esc(goal.title)}</strong><small>feito</small></button>`).join('')}</div>`:day<=today()?'<p class="calendar-empty-day">nenhuma conquista registrada neste dia ainda.</p>':''}${pending.length?`<details class="calendar-pending"><summary>${day>today()?'ver sonhos previstos':`ver outros registros (${pending.length})`}</summary>${pending.map(row).join('')}</details>`:''}</section>`;
}
function renderCalendar(){
 const first=new Date(state.year,state.month,1),days=new Date(state.year,state.month+1,0).getDate(),title=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 const monthPrefix=localDay(first).slice(0,7);
 if(!state.calendarDay?.startsWith(monthPrefix))state.calendarDay=today().startsWith(monthPrefix)?today():localDay(first);
 let cells='<div class="calendar-day blank" aria-hidden="true"></div>'.repeat(first.getDay());
 for(let n=1;n<=days;n++){
  const day=localDay(new Date(state.year,state.month,n)),entries=calendarEntries(day),summary=calendarSummary(entries,day,today());
  const label=day>today()?`${summary.total} previstos`:summary.total?`${summary.completed} de ${summary.total} concluídos, ${summary.percent}%`:'sem sonhos previstos';
  cells+=`<button class="calendar-day ${day===today()?'current':''} ${day===state.calendarDay?'selected':''} ${day>today()?'future':''} ${summary.total&&day<=today()?'has-plan':''}" type="button" data-action="calendar-day" data-day="${day}" style="--day-ink:${summary.total&&day<=today()?6+summary.percent*.32:0}%" ${day===today()?'aria-current="date"':''} aria-pressed="${day===state.calendarDay}" aria-controls="calendarDayDetail" aria-label="${n} de ${title}. ${label}"><span class="calendar-number">${n}</span></button>`;
 }
 $('#content').innerHTML=`<div class="calendar-panel calendar-compact"><div class="calendar-heading"><h2 aria-live="polite">${title}</h2><div class="calendar-controls"><button class="icon-button" data-action="prev" aria-label="mês anterior" title="mês anterior">${icon('chevronLeft')}</button><button class="secondary calendar-now" data-action="calendar-now">hoje</button><button class="icon-button" data-action="next" aria-label="próximo mês" title="próximo mês">${icon('chevronRight')}</button></div></div><select id="calendarGoal" class="calendar-goal-select" aria-label="filtrar calendário por sonho"><option value="all">todos os sonhos</option>${state.goals.map(g=>`<option value="${g.id}" ${state.calendarGoal===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select><div class="weekdays" aria-hidden="true">${['dom','seg','ter','qua','qui','sex','sáb'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><div class="calendar-color-key"><span>0%</span><span class="calendar-color-scale" aria-hidden="true">${[6,14,22,30,38].map(value=>`<i style="--day-ink:${value}%"></i>`).join('')}</span><span>100% concluído</span></div><p class="calendar-legend">a cor ganha força a cada sonho concluído. toque em um dia para ver seus adesivos.</p><div id="calendarDayDetail">${calendarDayDetail(state.calendarDay)}</div></div>`;
}
function openCalendarDay(day){
 state.calendarDay=day;
 renderCalendar();
 document.querySelector(`[data-action="calendar-day"][data-day="${day}"]`)?.focus({preventScroll:true});
}
function animateProgress(g,previous){
 celebrateMilestone(g,previous);
 const achievement=progress(g)>previous&&practiceAchievement(g);
 if(achievement)document.querySelectorAll('[data-goal]').forEach(card=>{
  if(card.dataset.goal===g.id)card.querySelectorAll('[data-practice-milestone]').forEach(cell=>{
   if(Number(cell.dataset.practiceMilestone)===achievement)cell.classList.add('seal-conquered');
  });
 });
 document.dispatchEvent(new CustomEvent('dreamprogress',{detail:{id:g.id,from:previous/targetOf(g),to:progress(g)/targetOf(g)}}));
}
async function changeDay(id,day=today()){if(state.busy)return;const g=state.goals.find(x=>x.id===id);if(!g)return;const previous=progress(g);state.busy=true;document.querySelectorAll(`[data-id="${id}"]`).forEach(b=>b.disabled=true);try{const was=g.days.includes(day);if(state.demo){g.days=was?g.days.filter(d=>d!==day):[...g.days,day];if(!was)g.failures=(g.failures||[]).filter(d=>d!==day);if(g.days.length<g.target)g.redeemed=0}else{const result=await api('/'+id+'/check','POST',{day,done:!was});Object.assign(g,result)}render();toast(was?'Registro desfeito. Seu caminho continua.':complete(g)?'Seu sonho floresceu!':'Mais um pequeno passo. Ele conta.');animateProgress(g,previous)}catch(e){toast(e.message);render()}finally{state.busy=false}}
$('#goalForm').addEventListener('submit',async e=>{e.preventDefault();if(state.busy)return;const id=$('#goalId').value,body={title:$('#goalTitle').value.trim(),reward:$('#goalReward').value.trim(),target:Number($('#goalTarget').value),groupId:$('#goalGroup').value||null,color:state.goals.find(g=>g.id===id)?.color||automaticAmulet(state.goals)};try{body.reopen=$('#goalForm').dataset.reopen==='true';body.plan=validatePlan(formPlan());if(body.reopen&&needsIncompleteReview({...state.goals.find(g=>g.id===id),target:body.target,plan:body.plan}))throw Error('Ajuste o prazo ou a meta para voltar a acompanhar este sonho.');if(body.plan.kind==='habit'&&$('#habitMeasure').value==='tasks'&&!body.plan.tasks.length)throw Error('Adicione pelo menos uma tarefa para esta rotina.');body.target=targetOf({...body});if(!body.title)throw Error('Dê um nome ao seu sonho.')}catch(e){$('#formError').textContent=e.message;return}state.busy=true;$('#saveGoal').disabled=true;try{if(state.demo){if(id){const old=state.goals.find(g=>g.id===id);if(planOf(old).incompleteAccepted&&needsIncompleteReview({...old,...body}))body.plan.incompleteAccepted=true;Object.assign(old,body,{group_id:body.groupId,redeemed:0})}else state.goals.push({...body,group_id:body.groupId,id:'demo-'+crypto.randomUUID(),days:[],entries:[],redeemed:0})}else{const g=await api(id?'/'+id:'',id?'PATCH':'POST',body);if(id)Object.assign(state.goals.find(x=>x.id===id),g);else state.goals.push(g);state.real=state.goals}$('#goalDialog').close();render();const saved=id?state.goals.find(g=>g.id===id):state.goals.at(-1);if(id&&saved&&needsIncompleteReview(saved)&&!planOf(saved).incompleteAccepted)reviewDeferred.delete(id);if($('#incompleteDialog').open)renderIncompleteCollection();if(!id&&saved&&pendingPastDays(saved,today()).length){openDetails(saved.id,pendingPastDays(saved,today())[0]);$('#historyDays')?.scrollIntoView({block:'start'})}toast(state.demo?'Exemplo atualizado. Seus dados reais continuam separados.':id?'Seu sonho ganhou novos cuidados.':'O primeiro capítulo está escrito.')}catch(e){$('#formError').textContent=e.message}finally{state.busy=false;$('#saveGoal').disabled=false;checkIncompleteNotice()}});
let deleteId;
document.addEventListener('click',async e=>{const close=e.target.closest('[data-close]');if(close){$('#'+close.dataset.close).close();return}const b=e.target.closest('[data-action]');if(!b)return;const {action,id,day}=b.dataset;if(action==='new')openForm();if(action==='demo')showDemo();if(action==='edit')openForm(id);if(action==='delete'){deleteId=id;showDialog($('#confirmDialog'))}if(action==='check'||action==='day')await changeDay(id,day);if(action==='calendar-day')openCalendarDay(day);if(action==='calendar-now'){state.calendarDay=today();const d=dateFrom(today());state.year=d.getFullYear();state.month=d.getMonth();renderCalendar();document.querySelector('[data-action=calendar-now]')?.focus()}if(action==='prev'||action==='next'){state.month+=action==='next'?1:-1;const d=new Date(state.year,state.month,1);state.year=d.getFullYear();state.month=d.getMonth();render();document.querySelector(`[data-action="${action}"]`)?.focus()}});
$('#confirmDelete').addEventListener('click',async()=>{if(state.busy)return;state.busy=true;$('#confirmDelete').disabled=true;try{if(!state.demo)await api('/'+deleteId,'DELETE');state.goals=state.goals.filter(g=>g.id!==deleteId);if(!state.demo)state.real=state.goals;if(state.calendarGoal===deleteId)state.calendarGoal='all';$('#confirmDialog').close();render();toast('Espaço aberto para novos caminhos.')}catch(e){toast(e.message)}finally{state.busy=false;$('#confirmDelete').disabled=false}});
$('#content').addEventListener('change',e=>{if(e.target.id==='calendarGoal'){state.calendarGoal=e.target.value;renderCalendar();$('#calendarGoal').focus()}});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;state.view=b.dataset.view;render()}));$('#newGoalButton').addEventListener('click',()=>openForm());$('#settingsButton').addEventListener('click',()=>showDialog($('#settingsDialog')));$('#retryButton').addEventListener('click',load);$('#leaveDemo').addEventListener('click',()=>{resetMilestonePanel();state.demo=false;state.goals=state.real;state.groups=state.realGroups;state.calendarGoal='all';render()});$('#exportButton').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),demo:state.demo,goals:state.goals,groups:state.groups},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tiny-dreams-${today()}${state.demo?'-exemplo':''}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Uma cópia da sua história, guardada.')});
Object.assign(icons,{
 plus:'<path d="M12 5v14M5 12h14"/>',
 undo:'<path d="M9 4 4 9l5 5M4 9h9a7 7 0 0 1 0 14"/>',
 potion:'<rect x="9" y="2" width="6" height="3" rx=".8"/><path d="M10 5v6c-3 1-5 3-5 5.5C5 20 8 22 12 22s7-2 7-5.5c0-2.5-2-4.5-5-5.5V5M6 16q3-2 6 0t6 0"/><path d="M9 19h1"/>',
 skip:'<circle cx="12" cy="12" r="9"/><path d="M8 8 13 12 8 16Z" fill="currentColor" stroke="none"/><rect x="14" y="8" width="2" height="8" rx=".75" fill="currentColor" stroke="none"/>',
 diary:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4m-4 5h4m-4 5h4m6-10h4m-4 4h4"/>',
 ghost:'<path d="M19 10a7 7 0 0 0-14 0c0 3-1 5-3 6 2 .5 3.5 0 4.5-1C7 19 10 21 14 21c-1.5-1-2-2-1.5-3.5C17 18 20 14.5 19 10Z"/><circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="10" r=".8" fill="currentColor" stroke="none"/><path d="M10 13q1.5 1.5 3 0"/>',
 shell:'<path d="m12 21-8-6C-2 4 10 0 12 6c2-6 14-2 8 9l-8 6ZM12 6v15M7 6l5 15m5-15-5 15M4 11l8 10m8-10-8 10"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2ZM12 1v2m0 18v2M1 12h2m18 0h2"/>',
 mask:'<path d="M3 6c4 2 5-2 9 0 4-2 5 2 9 0v6c-2 7-6 9-9 5-3 4-7 2-9-5V6Z"/><path d="M6 10q2-2 4 0m4 0q2-2 4 0M9 14q3 3 6 0"/>',
 envelope:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7M3 19l6-7m12 7-6-7"/>',
 lamp:'<path d="m8 3-5 10h18L16 3H8Zm4 10v8m-5 0h10M8 13v3"/>',
 train:'<rect x="5" y="3" width="14" height="16" rx="4"/><path d="M5 11h14M12 3v8M8 19l-3 3m11-3 3 3M8 22h8"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
 key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3"/>',
 needle:'<path d="M19 3C15 1 3 21 3 21S23 7 19 3Z"/><path d="m16 6 1-1M20 4c5 7-8 10-4 15"/>',
 cross:'<path d="m6 6 12 12M18 6 6 18"/>',
 water:'<path d="M12 3c-2 4-7 8-7 12a7 7 0 0 0 14 0c0-4-5-8-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
 moon:'<path d="M20 14A9 9 0 0 1 10 4a9 9 0 1 0 10 10Z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>',
 music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
 pen:'<path d="m4 16-1 5 5-1L21 7l-4-4L4 16ZM14 6l4 4M3 21l5-1"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
 flower:'<path d="M12 8C4 0 0 11 8 12c-8 8 3 12 4 4 8 8 12-3 4-4 8-8-3-12-4-4Z"/><circle cx="12" cy="12" r="2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
 coffee:'<path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 0h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 strength:'<path d="m7 7 10 10M3 8l5-5M2 5l3-3m11 19 5-5m-2 6 3-3M5 10l5-5m4 14 5-5"/>',
 apple:'<path d="M12 7c-8-5-12 4-7 12 2 3 4 2 7 1 3 1 5 2 7-1 5-8 1-17-7-12Zm0 0c0-4 2-5 4-5M12 7C8 7 7 5 7 3c3 0 5 1 5 4Z"/>'
});
const emojiChoices=[['📖','Livro','book'],['💧','Água','water'],['🌿','Folha','leaf'],['⭐','Estrela','star'],['🎯','Meta','target'],['🌙','Lua','moon'],['🍎','Fruta','apple'],['💪','Força','strength'],['🎵','Música','music'],['✍️','Escrita','pen'],['💰','Poupança','coin'],['🌸','Flor','flower'],['☀️','Sol','sun'],['❤️','Coração','heart'],['☕','Café','coffee'],['🏡','Casa','home']];
function symbolChoice(value){return emojiChoices.find(([emoji])=>emoji===value)||emojiChoices.find(([emoji])=>emoji===({'✨':'⭐','💫':'⭐','🍓':'🍎','🫧':'💧'}[value]))||emojiChoices[0]}
function goalEmoji(g){const value=planOf(g).emoji||({sage:'🌿',peach:'⭐',lavender:'📖'}[g.color]||'📖');return icon(symbolChoice(value)[2],'card-symbol')}
$('#emojiChoices').innerHTML=emojiChoices.map(([value,name,symbol])=>`<button type="button" class="emoji-choice" data-emoji="${value}" aria-label="${name}" aria-pressed="false">${icon(symbol)}</button>`).join('');
function updateEmojiPicker(){const selected=symbolChoice($('#goalEmoji').value.trim());$('#emojiPreview').innerHTML=icon(selected[2]);document.querySelectorAll('[data-emoji]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.emoji===selected[0])))}
$('#emojiChoices').addEventListener('click',event=>{const button=event.target.closest('[data-emoji]');if(button){$('#goalEmoji').value=button.dataset.emoji;updateEmojiPicker()}});
const weekNames=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n);
function currencyOf(g){const p=planOf(g),u=(p.unit||'').trim();return p.kind==='amount'&&/^(r\$|us\$|ca\$|au\$|\$|€|£|¥|brl|usd|eur|gbp|ars|cad|aud|jpy|chf|cny)$/i.test(u)?u.toUpperCase():''}
function amountText(g,value){const currency=currencyOf(g);return currency?`${currency} ${fmt(value)}`:`${fmt(value)} ${unit(g)}`}
function progressText(g){return currencyOf(g)?`${amountText(g,progress(g))} de ${amountText(g,targetOf(g))}`:`${fmt(progress(g))} de ${fmt(targetOf(g))} ${unit(g)}`}
const prettyDay=d=>d?dateFrom(d).toLocaleDateString('pt-BR'):'';
function deadline(g){const p=planOf(g);if(complete(g))return 'Sonho concluído';if(p.start&&p.start>today())return `Começa em ${prettyDay(p.start)}`;if(!p.end)return 'Sem prazo definido';const n=daysUntil(p.end,today());return n<0?`Prazo em ${prettyDay(p.end)} · encerrado`:n===1?'Prazo hoje':`Até ${prettyDay(p.end)}`}
function impulseTime(g){const n=impulseElapsed(g).seconds;return `${Math.floor(n/86400)}d ${String(Math.floor(n/3600)%24).padStart(2,'0')}h ${String(Math.floor(n/60)%60).padStart(2,'0')}m ${String(n%60).padStart(2,'0')}s`}
function impulseClockContent(g){
 const n=impulseElapsed(g).seconds,days=Math.floor(n/86400);
 return `<strong class="impulse-days">${days}<span>${days===1?'dia':'dias'}</span></strong><small class="impulse-hours">${String(Math.floor(n/3600)%24).padStart(2,'0')}h ${String(Math.floor(n/60)%60).padStart(2,'0')}m ${String(n%60).padStart(2,'0')}s</small>`;
}
function impulseClock(g){return `<span class="impulse-clock" data-impulse-clock="${g.id}" data-clock-days="${progress(g)}" aria-label="tempo sem ceder ao impulso">${impulseClockContent(g)}</span>`}
if(typeof window!=='undefined')window.setInterval(()=>{if(document.hidden)return;document.querySelectorAll('[data-impulse-clock]').forEach(node=>{const g=state.goals.find(g=>g.id===node.dataset.impulseClock);if(g){node.innerHTML=impulseClockContent(g);if(Number(node.dataset.clockDays)!==progress(g)&&!document.querySelector('dialog[open]')){const previous=Number(node.dataset.clockDays);render();animateProgress(g,previous)}}})},1000);
function cardCountdown(g){
 if(complete(g))return {value:'✓',label:'Você realizou seu tydream!'};
 if(planOf(g).impulse)return {value:impulseTime(g),label:'sem ceder ao impulso'};
 const p=planOf(g),remaining=Math.max(0,Math.round((targetOf(g)-progress(g))*100)/100);
 let count=remaining,measure,value;
 if(p.kind==='habit'&&p.end){
  const days=daysUntil(p.end,today());
  if(days!==null){if(days<0)return {value:'0',label:'Prazo encerrado'};count=days;measure=days===1?'dia':'dias'}
 }
 if(!measure){
  if(p.kind==='habit')measure=completionMode(p)==='streak'?(count===1?'dia consecutivo':'dias consecutivos'):(count===1?'conclusão':'conclusões');
  else if(p.kind==='list')measure=count===1?'conclusão':'conclusões';
  else if(['R$','BRL'].includes(currencyOf(g))||/^(real|reais)$/i.test(p.unit.trim()))measure=count===1?'real':'reais';
  else if(currencyOf(g)){value=amountText(g,count);measure=''}
  else measure=p.unit.trim()||(count===1?'unidade':'unidades');
 }
 return {value:value||fmt(count),lead:count===1?'Só falta':'Só faltam',label:`${measure?measure+' ':''}para realizar seu tydream`};
}
function unit(g){const p=planOf(g);return p.kind==='habit'?(completionMode(p)==='streak'?'dias consecutivos':'dias'):p.kind==='list'?'etapas':p.unit||'unidades'}
function routineLabel(g){const p=planOf(g);return p.kind==='habit'?(p.weekdays.length===7?'Todos os dias':p.weekdays.map(d=>weekNames[d]).join(', ')):p.kind==='list'?'Livros, consultas e etapas':'Meta de valor'}
function frontDailyActions(g,iconOnly=false){
 if(planOf(g).kind!=='habit')return '';
 const p=planOf(g),status=outcomeOf(g,today()),allowed=scheduled(g,today()),measured=p.tasks.length||p.dailyTarget,notStarted=!!p.start&&p.start>today(),skippedToday=(p.skippedDays||[]).includes(today());
 if(p.impulse)return `<div class="quick-outcomes"><button class="check-button failure-button" data-action="impulse-relapse" data-id="${g.id}" ${notStarted||skippedToday?'disabled':''}>${icon('cross')}<span>registrar recaída</span></button></div>`;
 const counterTotal=p.dailyCounter?dailyTotal(g,today()):0,counterDone=p.dailyCounter&&counterTotal>=p.dailyTarget;
 const successAction=notStarted?'data-action="not-started"':p.dailyList?'data-action="daily-list-check"':p.dailyCounter?'data-action="quick-repeat"':measured?'data-action="details"':'data-action="quick-outcome" data-status="success"';
 const successLabel=p.dailyCounter?(counterDone?'Desfazer última ocorrência':`Registrar ocorrência · ${fmt(counterTotal)}/${fmt(p.dailyTarget)} concluídas`):measured?(p.dailyList?'Marcar itens de hoje':p.dailyTarget?'Registrar quantidade':'Ver tarefas'):status==='success'?(p.impulse?'Resisti · desfazer':'Feito · desfazer'):(p.impulse?'Resisti hoje':'Fiz hoje');
 const failureLabel=status==='failure'?(p.impulse?'Cedi · desfazer':'Falha · desfazer'):(p.impulse?'Cedi ao impulso':'Falha hoje');
 return `<div class="quick-outcomes" role="group" aria-label="Resultado de hoje: ${esc(g.title)}"><button aria-label="${esc(successLabel)}" class="check-button ${notStarted?'not-started':''} ${status==='success'?'done':''}" ${successAction} data-id="${g.id}" ${measured?'':`aria-pressed="${status==='success'}"`} ${skippedToday?'disabled':notStarted?'aria-disabled="true" title="Ainda não começou"':!allowed&&(measured||status!=='success')?'disabled':''}>${icon(p.dailyCounter&&counterDone?'undo':'check')}${p.dailyCounter?`<span>${counterDone?'desfazer · ':''}${fmt(counterTotal)}/${fmt(p.dailyTarget)}</span>`:iconOnly?'':`<span>${successLabel}</span>`}</button><button aria-label="${esc(failureLabel)}" class="check-button failure-button ${notStarted?'not-started':''} ${status==='failure'?'failed':''}" data-action="${notStarted?'not-started':'quick-outcome'}" data-status="failure" data-id="${g.id}" aria-pressed="${status==='failure'}" ${skippedToday?'disabled':notStarted?'aria-disabled="true" title="Ainda não começou"':!allowed&&status!=='failure'||measured&&status==='success'?'disabled':''}>${icon('cross')}${iconOnly?'':`<span>${failureLabel}</span>`}</button></div>`;
}
function progressToken(){return `<i class="progress-token" aria-hidden="true">${icon(window.DreamThemes?.current?.progressSymbol||'star')}</i>`}
function dailyItemProgress(g,day=today()){
 const p=planOf(g);if(p.kind!=='habit'||!p.tasks.length||!scheduled(g,day))return '';
 const tasks=tasksOn(g,day);if(!tasks.length)return '';
 const completedTasks=tasks.filter(task=>(g.entries||[]).some(entry=>entry.key===`${day}:${task.id}`)),done=completedTasks.length;
 return `<div class="daily-item-progress"><p>${day===today()?'hoje':prettyDay(day)}</p><div class="daily-item-track" style="--daily-columns:${Math.min(tasks.length,8)}" role="progressbar" aria-label="itens de ${esc(g.title)} em ${prettyDay(day)}" aria-valuemin="0" aria-valuemax="${tasks.length}" aria-valuenow="${done}">${tasks.map((task,index)=>{const checked=index<done;return `<span class="daily-item-step ${checked?'is-done':''}" data-progress-key="${checked?esc(`${day}:${completedTasks[index].id}`):''}" aria-hidden="true">${checked?icon('check'):''}</span>`}).join('')}</div></div>`;
}
function amountTrend(g){
 if(planOf(g).kind!=='amount'||planOf(g).end)return '';
 const daily=new Map();for(const entry of g.entries||[])daily.set(entry.day,(daily.get(entry.day)||0)+entry.value);
 let total=0;const points=[...daily].sort(([a],[b])=>a.localeCompare(b)).map(([day,value])=>({day,value:total=Math.round((total+value)*100)/100}));
 if(!points.length)return '';
 const first=Date.parse(points[0].day),last=Date.parse(points.at(-1).day),current=points.at(-1).value,target=targetOf(g),gain=current-points[0].value;
 const projected=points.length>1&&last>first&&gain>0&&current<target?last+(target-current)/(gain/(last-first)):null;
 const until=projected||last,max=Math.max(target,current,1),x=time=>until===first?125:4+(time-first)/(until-first)*242,y=value=>92-value/max*76;
 const coords=points.map(p=>({x:x(Date.parse(p.day)),y:y(p.value)})),path=coords.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '),end=coords.at(-1);
 const estimate=projected&&Number.isFinite(projected)&&projected<Date.parse('2100-01-01')?new Date(projected).toISOString().slice(0,10):null;
 const endDay=estimate||points.at(-1).day;
 const shortDate=day=>prettyDay(day).slice(0,5);
 const caption=projected?`pontilhado: projeção pelo ritmo dos aportes${estimate?' · '+prettyDay(estimate):''}`:points.length>1?'valor acumulado por data':'primeiro registro';
 return `<div class="amount-trend" role="img" aria-label="${esc(`valor acumulado: ${points.map(p=>`${amountText(g,p.value)} em ${prettyDay(p.day)}`).join('; ')}. meta: ${amountText(g,target)}. ${caption}`)}"><div class="amount-trend-heading"><strong>projeção</strong><span data-user-content>${esc(amountText(g,target))}</span></div><svg viewBox="0 0 250 100" preserveAspectRatio="none" aria-hidden="true"><path class="amount-trend-axes" d="M4 4V96H246"/><path class="amount-trend-target" d="M4 ${y(target)}H246"/>${points.length>1?`<path class="amount-trend-area" d="${path} L${end.x} 96 L${coords[0].x} 96 Z"/><path class="amount-trend-line" d="${path}"/>`:''}${projected?`<path class="amount-trend-projection" d="M${end.x} ${end.y}L246 ${y(target)}"/>`:''}<circle cx="${end.x}" cy="${end.y}" r="2.5"/></svg><span class="amount-axis-zero" aria-hidden="true">0</span><div class="amount-trend-dates" aria-hidden="true"><span>${shortDate(points[0].day)}</span><span>${shortDate(endDay)}</span></div></div>`;
}
function fitAmountTrends(){
 document.querySelectorAll('.amount-trend').forEach(chart=>{
  const summary=chart.closest('.goal').querySelector('.dream-summary'),value=summary.querySelector('.countdown strong');
  chart.hidden=false;
  chart.classList.add('expanded-trend');
  value.style.removeProperty('font-size');
  if(value.scrollWidth>value.clientWidth){const size=parseFloat(getComputedStyle(value).fontSize);value.style.fontSize=`${Math.max(18,size*value.clientWidth/value.scrollWidth)}px`}
 });
}
window.addEventListener('resize',()=>requestAnimationFrame(fitAmountTrends),{passive:true});
function practiceMilestones(g){return [...new Set([...[3,7,15,21,30].filter(n=>n<targetOf(g)),targetOf(g)])]}
function practiceMilestoneDays(g){
 const p=planOf(g),marks=practiceMilestones(g),result=new Map();let count=0,previous='';
 for(const day of habitDays(g)){
  if((g.failures||[]).includes(day))continue;
  if(completionMode(p)==='streak')count=previous&&practiceDays(previous,day,p.weekdays)-(p.skippedDays||[]).filter(d=>d>=previous&&d<=day&&p.weekdays.includes(weekday(d))).length===2?count+1:1;
  else count++;
  if(marks.includes(count))result.set(day,count);
  previous=day;
 }
 return result;
}
function practiceSeal(number,pending=false){return `<span class="practice-seal ${pending?'pending-seal':''}" aria-hidden="true"><svg viewBox="0 0 48 48"><circle class="seal-outer" cx="24" cy="24" r="22"/><circle class="seal-inner" cx="24" cy="24" r="18"/><text class="seal-number" x="24" y="24" text-anchor="middle" dominant-baseline="central">${fmt(number)}</text></svg><span>${fmt(number)}</span></span>`}
function practiceAchievement(g){
 if(planOf(g).kind!=='habit')return 0;
 const number=planOf(g).impulse?progress(g):practiceMilestoneDays(g).get(today());
 return practiceMilestones(g).includes(number)?number:0;
}
function practiceAchievementScene(g){const number=practiceAchievement(g);return number?`<div class="practice-achievement" role="img" aria-label="marco de ${number} dias conquistado">${practiceSeal(number)}<span>dias</span></div>`:''}
function finishRays(){return '<svg class="finish-rays" viewBox="0 0 56 56" fill="none" aria-hidden="true"><path d="M28 0v3m0 50v3M2 28h2m49 0h3M7 7l3 3m36 36 3 3M7 49l3-3m36-36 3-3"/></svg>'}
function deadlineLabel(day,asOf=today()){
 const remaining=daysUntil(day,asOf);
 if(remaining===1)return 'até hoje';
 if(remaining===2)return 'até amanhã';
 if(remaining>2&&remaining<=7)return 'até '+['domingo','segunda','terça','quarta','quinta','sexta','sábado'][dateFrom(day).getDay()];
 return 'até '+(day.slice(0,4)===asOf.slice(0,4)?prettyDay(day).slice(0,5):prettyDay(day));
}
function cardDeadline(g){
 const end=planOf(g).end;if(!end)return '';
 return `<time class="card-progress-deadline ${end<today()&&!complete(g)?'overdue':''}" datetime="${end}" title="prazo: ${prettyDay(end)}" aria-label="prazo: ${prettyDay(end)}">${deadlineLabel(end)}</time>`;
}
function streakCaption(g,text){return `<div class="streak-caption"><span>${text}</span>${cardDeadline(g)}</div>`}
function finishNumber(g){return `<span class="target-finish-number">${fmt(targetOf(g))}</span>`}
// Build a practice sequence: rest/skip dates consume no cell between planned days.
// Today stays anchored; only dates before the start fill the leading watermark slots.
function practiceGridDates(g,start,archived=false){
 const p=planOf(g),shift=(day,n)=>{const date=dateFrom(day);date.setDate(date.getDate()+n);return localDay(date)};
 const eligible=day=>day<start||!!p.end&&day>p.end||scheduled(g,day)||day===p.end&&!(p.skippedDays||[]).includes(day);
 const collect=(anchor,count,direction)=>{const days=[];let day=anchor;while(days.length<count){day=shift(day,direction);if(eligible(day))days.push(day)}return days};
 if(archived)return [...collect(p.end,13,-1).reverse(),p.end];
 return [...collect(today(),10,-1).reverse(),today(),...collect(today(),3,1)];
}
function habitStreakGrid(g){
 const p=planOf(g);if(p.kind!=='habit')return '';
 if(p.impulse){
  const completed=progress(g),marks=practiceMilestones(g),latest=marks.filter(n=>n<=completed).at(-1);
  const dates=practiceGridDates(g,dayBefore(completed));
  const cells=dates.map(date=>{
   const day=completed+1-Math.round((dateFrom(today())-dateFrom(date))/86400000),beforeStart=day<1,rest=beforeStart||!scheduled(g,date),done=!rest&&day<=completed,current=day===completed+1,future=day>completed+1,finish=p.end?date===p.end:day===targetOf(g),beyond=p.end?date>p.end:day>targetOf(g),skipped=(p.skippedDays||[]).includes(date);
   if(rest||skipped)return `<li class="streak-square rest ${date===today()?'current rest-today':beforeStart?'prestart-day':''} ${beyond?'beyond-target':''}" data-practice-day="${date}" ${date!==today()?'aria-hidden="true"':''} ${future?'data-practice-future="true"':''} aria-label="${esc(prettyDay(date)+': '+(skipped?'dia pulado':'sem atividade prevista'))}"></li>`;
   const label=(rest?'antes do início':`dia ${day}: ${done?'24 horas completas':current?'em andamento':'a completar'}`)+(finish?(p.end?' · último dia do prazo, '+prettyDay(p.end):'')+' · meta de '+fmt(targetOf(g))+' dias':'');
   return `<li class="streak-square ${rest?'rest':done?'success':'unrecorded'} ${current?'current':''} ${finish?'goal-finish':''} ${finish&&p.end?'deadline-finish':''} ${finish&&!done?'target-finish':''} ${beyond?'beyond-target':''}" data-practice-day="${date}" ${beyond?'aria-hidden="true"':''} ${future?'data-practice-future="true"':''} ${done&&day===latest?`data-practice-milestone="${day}"`:''} aria-label="${esc(label)}" title="${esc(label)}">${finish?finishRays():''}${finish?(done&&day===latest&&day===targetOf(g)?practiceSeal(day):finishNumber(g)):rest?icon('cross'):done&&day===latest?practiceSeal(day):done?icon('check'):''}</li>`;
  });
  return `<div class="habit-streak impulse-streak">${streakCaption(g,`${completed} ${completed===1?'dia completo':'dias completos'}`)}<ol class="streak-grid" aria-label="dias de 24 horas da sequência atual">${cells.join('')}</ol></div>`;
 }
 const milestoneDays=practiceMilestoneDays(g),latestDay=[...milestoneDays.keys()].filter(day=>day<=today()).sort().at(-1);
 const start=p.start||[...g.days,...(g.failures||[]),...(g.entries||[]).map(e=>e.day)].sort()[0]||today();
 const archived=isArchivedIncomplete(g),dates=practiceGridDates(g,start,archived);
 // Dated habits mark their fixed deadline. Undated habits project the remaining
 // scheduled successes. Reserved cells after the finish keep the grid stable.
 let finish=p.end||habitCompletionDay(g),remaining=Math.max(0,targetOf(g)-progress(g));
 if(!finish&&!archived){
  for(const day of dates.filter(day=>day>=today())){
   if(scheduled(g,day)&&!dayDone(g,day)&&outcomeOf(g,day)!=='failure'&&remaining>0){remaining--;if(!remaining){finish=day;break}}
  }
 }
 const cells=dates.map(day=>{
  const rest=day<start||!scheduled(g,day),status=rest?'rest':outcomeOf(g,day),label=`${prettyDay(day)}: ${rest?'sem atividade prevista':day>today()?'dia futuro, ainda não disponível':status==='success'?'cumprido':status==='failure'?'falha':day===today()?'ainda não registrado hoje':'sem registro'}`;
  const number=day===latestDay?milestoneDays.get(day):0,seal=number,finishPending=day===finish&&status!=='success',beyond=!!finish&&day>finish,description=day===p.end?label+' · último dia do prazo · meta de '+fmt(targetOf(g))+' dias':finishPending?label+' · completa a meta de '+targetOf(g)+' dias se cumprido':number?label+' · marco de '+number+' dias conquistado':label;
  const skipped=(p.skippedDays||[]).includes(day);
  if(rest&&(day!==finish||skipped||day===today()))return `<li class="streak-square rest ${day===today()?'current rest-today':day<start?'prestart-day':''} ${beyond?'beyond-target':''}" data-practice-day="${day}" ${day!==today()?'aria-hidden="true"':''} ${!archived&&day>today()?'data-practice-future="true"':''} aria-label="${esc(prettyDay(day)+': '+(skipped?'dia pulado':'sem atividade prevista'))}"></li>`;
  return `<li class="streak-square ${status||'unrecorded'} ${day===today()?'current':''} ${seal?'has-practice-seal':''} ${finishPending?'target-finish':''} ${day===finish?'goal-finish':''} ${day===p.end?'deadline-finish':''} ${beyond?'beyond-target':''}" ${beyond?'aria-hidden="true"':''} data-practice-day="${day}" ${!archived&&day>today()?'data-practice-future="true"':''} ${number?`data-practice-milestone="${number}"`:''} aria-label="${esc(description)}" title="${esc(description)}">${day===finish?finishRays():''}${day===finish?(seal===targetOf(g)?practiceSeal(seal):finishNumber(g)):seal?practiceSeal(seal):status?icon(status==='success'?'check':'cross'):''}</li>`;
 });
 const count=streak(g);
 return `<div class="habit-streak">${streakCaption(g,archived?'período encerrado':`${count} ${count===1?'dia':'dias'} sem falhar`)}<ol class="streak-grid" aria-label="${archived?'últimos 14 dias do período':'10 dias previstos anteriores, hoje e os próximos 3 dias previstos'}">${cells.join('')}</ol></div>`;
}
function amuletCropStyle(edition,color){
 const geometry=edition?.geometry,rect=geometry?.objectBounds?.[{lavender:0,peach:1,sage:2}[color]];
 if(!rect)return '';
 const [x,y,width,height]=rect;
 return `;--amulet-crop-aspect:${width/height};--amulet-crop-width:${geometry.width/width*100}%;--amulet-crop-height:${geometry.height/height*100}%;--amulet-crop-x:${x/(geometry.width-width)*100}%;--amulet-crop-y:${y/(geometry.height-height)*100}%`;
}
function goalCard(g){const count=progress(g),target=targetOf(g),earned=complete(g),p=planOf(g),amulet=isArchivedIncomplete(g)?window.DreamThemes?.forCreation(g.created_at):window.DreamThemes?.current,countdown=cardCountdown(g);return `<article class="goal ${esc(g.color)} ${p.kind==='habit'&&homeStatus(g)===1?'done-today':''}" data-goal="${g.id}" data-complete="${earned}" data-goal-kind="${p.kind}" data-today-status="${homeStatus(g)}" data-amulet-edition="${esc(amulet?.id||'2026-10')}" style="${amulet?.asset?`--amulet-objects:url('${esc(amulet.asset)}');--amulet-aspect:${amulet.geometry.objectAspect};--amulet-sheet-height:${amulet.geometry.objectSheetHeight}%${amuletCropStyle(amulet,g.color)}`: ""}"><div class="goal-top"><span class="goal-symbol">${goalEmoji(g)}</span><div class="goal-menu">${p.kind==='habit'&&!p.impulse?`<button class="small-button skip-day-button" data-action="quick-outcome" data-status="skipped" data-id="${g.id}" aria-label="${outcomeOf(g,today())==='skipped'?'voltar a prever hoje':'pular dia de hoje'}: ${esc(g.title)}" title="${outcomeOf(g,today())==='skipped'?'voltar a prever hoje':'pular dia'}" aria-pressed="${outcomeOf(g,today())==='skipped'}" ${!scheduled({...g,plan:{...p,skippedDays:[]}},today())||dayDone(g,today())?'disabled':''}>${icon('skip')}</button>`:''}<button class="small-button diary-button" data-action="details" data-id="${g.id}" aria-label="histórico de ${esc(g.title)}" title="abrir histórico">${icon('diary')}</button><button class="small-button" data-action="edit" data-id="${g.id}" aria-label="Editar ${esc(g.title)}">${icon('edit')}</button><button class="small-button" data-action="delete" data-id="${g.id}" aria-label="Apagar ${esc(g.title)}">${icon('trash')}</button></div></div><div class="dream-summary ${p.kind==='amount'&&!p.end?'has-amount-trend':''}"><div class="amulet-frame" aria-hidden="true"><div class="talisman" style="--charge:${Math.min(1,count/target)}">${g.color==='sage'&&(!amulet||amulet.id==='2026-10')?'<span class="ghost-scene"><span class="ghost-jar"></span><span class="ghost-viewport"><span class="ghost-spirit"></span></span><span class="ghost-foreground"></span></span>':''}</div></div><div class="dream-summary-title"><h2>${esc(g.title)}</h2><p class="dream-summary-subtitle" data-user-content>${esc(agreementOf(g))}</p></div><div class="dream-summary-copy">${dailyStateBadge(g)}<div class="countdown">${countdown.lead?`<small class="countdown-lead">${esc(countdown.lead)}</small>`:''}${p.impulse&&!earned?impulseClock(g):`<strong data-user-content>${esc(countdown.value)}</strong>`}<span>${esc(countdown.label)}</span></div></div></div><div class="dream-daily-slot">${amountTrend(g)}${habitStreakGrid(g)}</div><div class="dream-date-slot">${p.kind!=='habit'?cardDeadline(g):''}</div><div class="dream-progress"><div class="progress" role="progressbar" aria-label="Progresso de ${esc(g.title)}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(count,target)}"><span style="width:${Math.min(100,count/target*100)}%">${progressToken()}</span></div><div class="progress-label"><span>${currencyOf(g)?`<span data-user-content>${esc(progressText(g))}</span>`:`${fmt(count)} de ${fmt(target)} ${esc(unit(g))}`}</span><span>${Math.min(100,Math.round(count/target*100))}%</span></div></div><div class="dream-card-footer">${g.reward?`<div class="reward">${icon('gift')}<div><div class="reward-label">${isArchivedIncomplete(g)?'Recompensa não liberada':earned?'Recompensa liberada':'Esperando por você'}</div><div class="reward-name"><span data-user-content>${esc(g.reward)}</span></div></div></div>`:''}${earned?`<button class="text-button completed-shelf-link" data-action="completed-shelf" data-id="${g.id}">${icon('book')}ver na coleção</button>`:`${frontDailyActions(g,true)}${p.kind!=='habit'?`<button class="text-button plan-open" data-action="details" data-id="${g.id}">${p.kind==='amount'?'adicionar valor':p.kind==='list'?'abrir minha lista':'abrir lista diária'}</button>`:''}`}</div></article>`}
function renderToday(){const habits=state.goals.filter(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&(!complete(g)||dayDone(g,today()))),items=state.goals.flatMap(g=>planOf(g).kind==='list'?planOf(g).items.filter(i=>i.date&&i.date<=today()&&!(g.entries||[]).some(e=>e.key===i.id)).map(i=>({g,i})):[]);$('#content').innerHTML=`<section class="today-panel" aria-label="tiny dreams de hoje"><div class="today-heading"><h2>hoje</h2><p>${habits.filter(g=>dayDone(g,today())).length} de ${habits.length} hábitos feitos${items.length?` · ${items.length} etapas até hoje`:''}</p></div>${habits.map(g=>`<div class="today-row"><span class="goal-symbol">${goalEmoji(g)}</span><div class="today-info"><h3>${esc(g.title)}</h3><p>${planOf(g).impulse?impulseClock(g):planOf(g).dailyTarget?`${fmt(dailyTotal(g,today()))} de ${fmt(planOf(g).dailyTarget)} <span data-user-content>${esc(planOf(g).unit)}</span> hoje`:tasksOn(g,today()).map(t=>esc(t.title)).join(' · ')||`${progress(g)} de ${targetOf(g)} dias`}</p></div>${frontDailyActions(g)}</div>`).join('')}${items.map(({g,i})=>`<div class="today-row"><div class="today-info"><h3>${esc(i.title)}</h3><p>${esc(g.title)} · ${prettyDay(i.date)}</p></div><button class="secondary" data-action="details" data-id="${g.id}">Ver etapa</button></div>`).join('')}${!habits.length&&!items.length?'<p class="muted">Nada pendente para hoje. Seus sonhos e prazos continuam na visão geral.</p>':''}</section>`}
function dayOptions(selected=[0,1,2,3,4,5,6]){return weekNames.map((d,i)=>`<label><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}
function updateTaskSummaries(){
 const rows=[...document.querySelectorAll('.routine-row')];
 rows.forEach((el,index)=>{
  el.querySelector('.task-summary-title').textContent=el.querySelector('.row-title').value.trim()||`nova tarefa ${index+1}`;
  const days=[...el.querySelectorAll('input[type="checkbox"]:checked')].map(e=>Number(e.value));
  el.querySelector('.task-summary-days').textContent=days.length===7?'Todos os dias':days.length?days.map(d=>weekNames[d]).join(' · '):'Escolha os dias';
 });
 $('#taskCount').textContent=`${rows.length} ${rows.length===1?'tarefa':'tarefas'}`;
 $('#taskEmpty').hidden=rows.length>0;
 const selected=[...$('#goalWeekdays').querySelectorAll('input:checked')].map(e=>Number(e.value));
 const schedule=selected.length===7?'Todos os dias':selected.length?selected.map(d=>weekNames[d]).join(', '):'Escolha os dias da rotina';
 const mode=$('#habitMeasure').value;
 const missing=selected.filter(day=>!rows.some(row=>[...row.querySelectorAll('input[type="checkbox"]:checked')].some(input=>Number(input.value)===day)));
 $('#taskCoverage').hidden=mode!=='tasks'||!rows.length||!missing.length;
 $('#taskCoverage').textContent=`Falta uma tarefa para: ${missing.map(day=>weekNames[day]).join(', ')}.`;
 $('#routineSummary').textContent=`${schedule} · ${mode==='tasks'?'concluir as tarefas previstas':mode==='counter'?'contar repetições no dia':mode==='quantity'?'atingir a quantidade diária':mode==='impulse'?'registrar como lidei com o impulso':'marcar como feito'}`;
}
function addRoutineRow(t){
 if(!t){const days=[...$('#goalWeekdays').querySelectorAll('input:checked')].map(e=>Number(e.value));t={id:crypto.randomUUID(),title:'',weekdays:days.length?days:[0,1,2,3,4,5,6]}}
 document.querySelectorAll('.routine-row').forEach(el=>el.open=false);
 const el=document.createElement('details');el.className='routine-row';el.name='routine-edit';el.dataset.key=t.id;el.open=true;
 el.innerHTML=`<summary><span class="task-summary-copy"><strong class="task-summary-title"></strong><span class="task-summary-days"></span></span><span class="task-edit-label">Editar</span></summary><div class="task-editor"><label>O que precisa ser feito?<input class="row-title" aria-label="Nome da tarefa" maxlength="200" value="${esc(t.title)}" placeholder="Nome da tarefa" required></label><fieldset class="task-days"><legend>Repetir em</legend><div class="day-options">${dayOptions(t.weekdays)}</div></fieldset><div class="task-editor-actions"><button type="button" class="text-button remove-row">Remover</button><button type="button" class="secondary finish-task">Pronto</button></div></div>`;
 $('#routineRows').append(el);updateTaskSummaries();
}
function addItemRow(i={id:crypto.randomUUID(),title:'',date:''}){const el=document.createElement('div');el.className='item-row';el.dataset.key=i.id;el.innerHTML=`<label>Etapa<input class="row-title" aria-label="Nome do livro, consulta ou etapa" maxlength="200" value="${esc(i.title)}" required></label><label>Data (opcional)<input class="row-date" aria-label="Data da etapa" type="date" value="${i.date||''}"></label><button type="button" class="text-button remove-row">Remover etapa</button>`;$('#itemRows').append(el)}
function isDailyList(){return $('#goalKind').value==='daily-list'}
function formKind(){return isDailyList()?'habit':$('#goalKind').value}
function syncDuration(){
 const target=$('#goalTarget'),hint=$('#durationHint'),habit=formKind()==='habit',mode=$('#goalCompletionMode').value,period=habit&&mode==='period';
 target.setCustomValidity('');target.readOnly=false;hint.hidden=!habit;$('#durationInfo').hidden=!habit;
 $('#completionModeField').hidden=!habit;$('#goalCompletionMode').disabled=!habit;
 $('#goalEndField').hidden=habit&&!period;$('#goalEnd').disabled=habit&&!period;
 $('#goalStart').required=period;$('#goalEnd').required=period;
 $('label[for="goalStart"]').textContent=period?'começa em':'começa em (opcional)';$('label[for="goalEnd"]').textContent=period?'termina em':'prazo (opcional)';
 $('#completionModeHint').textContent=mode==='total'?'Cada dia cumprido soma à meta. Falhas não apagam o progresso. Sem início definido, conte a partir do primeiro dia cumprido.':mode==='streak'?'Cumpra os dias da rotina em sequência. Falhas ou dias anteriores sem registro interrompem a sequência; você pode corrigir o histórico. Dias fora da rotina não interrompem.':'A meta corresponde aos dias da rotina entre início e término. Mudar o período recalcula a meta; chegar ao término não conclui o sonho automaticamente.';
 if(!habit){$('#durationInfo').open=false;return}
 $('#targetLabel').textContent=period?'Dias de prática no período':mode==='streak'?'Quantos dias consecutivos?':'Quantos dias cumpridos?';
 hint.textContent=period?'Defina início e término para calcular os dias da rotina.':mode==='streak'?'A conclusão fica conquistada ao atingir a sequência. Uma falha posterior não desfaz a conquista.':'A meta não depende de um prazo. Cada dia cumprido conta uma vez.';
 if(!period)return;
 const start=$('#goalStart').value,end=$('#goalEnd').value;
 if(!start||!end)return;
 const weekdays=[...$('#goalWeekdays').querySelectorAll('input:checked')].map(input=>Number(input.value)),count=practiceDays(start,end,weekdays);
 if(count===null){hint.textContent='O término precisa ser na data de início ou depois dela.';target.setCustomValidity(hint.textContent);return}
 target.readOnly=true;target.value=count;
 hint.textContent=count?`Pelo período: ${count} dias de prática, incluindo início e término. A meta acompanha as datas e os dias da rotina.`:'Nenhum dia da rotina neste período. Ajuste as datas ou os dias da semana.';
 if(!count)target.setCustomValidity(hint.textContent);
 if(count>3650){hint.textContent='Este período passa de 3650 dias de prática. Escolha um período menor.';target.setCustomValidity(hint.textContent)}
}
function syncKindChoices(){
 document.querySelectorAll('[name="goalKindChoice"]').forEach(input=>{input.checked=input.value===$('#goalKind').value;input.disabled=$('#goalKind').disabled});
}
document.querySelector('.dream-kind-options').addEventListener('change',event=>{
 if(!event.target.matches('[name="goalKindChoice"]'))return;
 $('#goalKind').value=event.target.value;$('#goalKind').dispatchEvent(new Event('change'));
});
function syncKind(){syncKindChoices();const daily=isDailyList(),kind=formKind();if(daily)$('#habitMeasure').value='tasks';$('#habitMeasureField').hidden=daily;$('#repeatList').disabled=$('#goalKind').disabled;$('#habitSetupTitle').textContent=daily?'Dias da sua lista':'Sua rotina';$('#taskFields h4').textContent=daily?'Itens para cumprir em cada dia':'Tarefas do hábito';$('#addRoutine').textContent=daily?'Adicionar item':'Adicionar tarefa';const quantity=kind==='habit'&&['quantity','counter'].includes($('#habitMeasure').value);$('#goalDailyTarget').step=$('#habitMeasure').value==='counter'?'1':'0.01';$('#goalDailyTarget').min=$('#habitMeasure').value==='counter'?'1':'0.01';$('#impulseFields').hidden=kind!=='habit'||$('#habitMeasure').value!=='impulse';$('#dailyQuantityFields').hidden=!quantity;$('#taskFields').hidden=kind!=='habit'||$('#habitMeasure').value!=='tasks';$('#completionHint').textContent=daily?'Os itens ficam disponíveis em cada dia da rotina. Cumprir todos conta um dia de prática; o tydream só termina ao atingir a meta de dias.':$('#habitMeasure').value==='impulse'?'O tempo corre automaticamente desde o início. Uma recaída reinicia o contador.':quantity?'Some seus registros ao longo do dia. A meta diária conclui o hábito.':$('#habitMeasure').value==='tasks'?'Cada tarefa pode ter seus próprios dias. Só aparecem as tarefas previstas para a data.':'Um toque para registrar seu dia, sem tarefas ou quantidades.';$('#goalDailyTarget').required=quantity;$('#goalDailyUnit').required=quantity;$('#goalDailyTarget').disabled=!quantity;$('#goalDailyUnit').disabled=!quantity;$('#habitFields').hidden=kind!=='habit';$('#listFields').hidden=kind!=='list';$('#targetField').hidden=kind==='list';$('#unitField').hidden=kind!=='amount';$('#goalTarget').required=kind!=='list';$('#goalTarget').max=kind==='habit'?3650:1000000000;$('#goalTarget').step=kind==='amount'?'0.01':'1';$('#targetLabel').textContent=kind==='habit'?'Quantos dias de prática?':'Qual valor quer alcançar?';document.querySelectorAll('#routineRows input').forEach(e=>e.disabled=kind!=='habit'||$('#habitMeasure').value!=='tasks');document.querySelectorAll('#itemRows input').forEach(e=>e.disabled=kind!=='list');updateTaskSummaries();syncDuration();if(editingGoal())showGoalStep(0,false)}
let goalStep=0;
function editingGoal(){return !!$('#goalId').value}
function goalSteps(){return formKind()==='amount'?[0,2,3]:[0,1,2,3]}
function showGoalStep(step,focus=true){
 const steps=goalSteps();goalStep=steps.includes(step)?step:steps[0];
 document.querySelectorAll('[data-goal-step]').forEach(section=>{section.hidden=editingGoal()?!steps.includes(Number(section.dataset.goalStep)):Number(section.dataset.goalStep)!==goalStep});
 const kind=$('#goalKind').value;
 const titles={0:'qual é o seu tiny dream?',1:kind==='list'?'quais etapas fazem parte?':kind==='daily-list'?'como é a sua lista diária?':'como será a sua rotina?',2:kind==='list'?'qual é o seu período?':'qual é a sua meta?',3:'deixe com a sua cara'};
 $('#goalStepTitle').textContent=titles[goalStep];$('#goalStepStatus').textContent=`passo ${steps.indexOf(goalStep)+1} de ${steps.length}`;
 $('#goalStepStatus').hidden=editingGoal();$('#goalStepTitle').hidden=editingGoal();
 $('#goalBack').hidden=editingGoal()||goalStep===0;$('#goalNext').hidden=editingGoal()||goalStep===3;$('#saveGoal').hidden=!editingGoal()&&goalStep!==3;
 $('#goalExtras').open=editingGoal()||goalStep===3;$('#formError').textContent='';
 if(focus&&!editingGoal()){$('#goalDialog').scrollTop=0;$('#goalStepTitle').focus()}
}
function validateGoalStep(){
 const section=document.querySelector(`[data-goal-step="${goalStep}"]`);
 for(const input of section.querySelectorAll('input,select,textarea')){
  if(input.disabled||input.type==='hidden'||(input.closest('[hidden]')&&input.closest('[hidden]')!==section))continue;
  if(!input.checkValidity()){showGoalStep(goalStep,false);input.closest('details')?.setAttribute('open','');input.reportValidity();return false}
 }
 let error='';
 if(goalStep===0&&!$('#goalTitle').value.trim())error='dê um nome ao seu tiny dream.';
 if(goalStep===1){
  const p=formPlan();
  if(p.kind==='habit'&&!p.weekdays.length)error='escolha pelo menos um dia para a rotina.';
  else if(p.kind==='habit'&&$('#habitMeasure').value==='tasks'&&!p.tasks.length)error='adicione pelo menos um item à rotina.';
  else if(p.kind==='list'&&!p.items.length)error='adicione pelo menos uma etapa.';
 }
 if(goalStep===2)try{validatePlan(formPlan())}catch(e){error=e.message}
 $('#formError').textContent=error;return !error;
}
function nextGoalStep(){if(validateGoalStep()){const steps=goalSteps();showGoalStep(steps[steps.indexOf(goalStep)+1])}}
$('#goalNext').addEventListener('click',nextGoalStep);
$('#goalBack').addEventListener('click',()=>{const steps=goalSteps();showGoalStep(steps[steps.indexOf(goalStep)-1])});
$('#goalForm').addEventListener('submit',event=>{
 if(!editingGoal()&&goalStep!==3){event.preventDefault();event.stopImmediatePropagation();nextGoalStep();return}
 for(const step of goalSteps()){
  goalStep=step;
  if(!validateGoalStep()){const error=$('#formError').textContent;showGoalStep(step);$('#formError').textContent=error;event.preventDefault();event.stopImmediatePropagation();return}
 }
},true);
function openForm(id){$('#durationInfo').open=false;$('#goalExtras').open=false;const g=state.goals.find(x=>x.id===id),p=g?planOf(g):planOf({});$('#goalGroup').innerHTML='<option value="">Sem Big Dream</option>'+state.groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');$('#goalGroup').value=g?.group_id||'';$('#goalId').value=g?.id||'';$('#goalTitle').value=g?.title||'';$('#goalReward').value=g?.reward||'';$('#goalTarget').value=g?targetOf(g):'';$('#goalEmoji').value=p.emoji||({sage:'🌿',peach:'⭐',lavender:'📖'}[g?.color]||'📖');updateEmojiPicker();$('#goalKind').value=p.dailyList?'daily-list':p.kind;$('#goalKind').disabled=!!g&&(g.days.length>0||(g.entries||[]).length>0||(g.failures||[]).length>0);$('#goalCompletionMode').value=g?completionMode(p):'total';$('#goalStart').value=p.start||'';$('#goalEnd').value=p.end||'';$('#goalNotes').value=g?agreementOf(g):'';$('#goalUnit').value=p.unit;$('#habitMeasure').value=p.impulse?'impulse':p.dailyCounter?'counter':p.dailyTarget?'quantity':p.tasks.length?'tasks':'check';$('#impulseStartTime').value=p.impulseStartedAt?new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(p.impulseStartedAt)):'';$('#habitMeasure').disabled=!!g&&!!(p.dailyTarget||p.tasks.length)&&(g.days.length>0||(g.entries||[]).length>0);$('#goalDailyTarget').value=p.dailyTarget||'';$('#goalDailyUnit').value=p.dailyTarget?p.unit:'';$('#goalDailyUnit').readOnly=!!p.dailyTarget&&!!g?.entries?.length;$('#goalWeekdays').innerHTML=dayOptions(p.weekdays);$('#routineRows').innerHTML='';$('#itemRows').innerHTML='';p.tasks.forEach(addRoutineRow);p.items.forEach(addItemRow);$('#goalForm .form-description').textContent=g?'ajuste os campos abaixo e salve suas alterações.':'defina o que quer acompanhar. você pode ajustar depois.';$('#goalForm').classList.toggle('editing-goal',!!g);$('#goalForm').dataset.reopen='';$('#formTitle').textContent=g?'editar tiny dream':'novo tiny dream';$('#saveGoal').textContent=g?'salvar alterações':'criar tiny dream';$('#formError').textContent='';syncKind();showGoalStep(0,false);showDialog($('#goalDialog'))}
function impulseFormStart(existing){
 const p=planOf(existing||{}),day=$('#goalStart').value,time=$('#impulseStartTime').value;
 if(p.impulseStartedAt){const d=new Date(p.impulseStartedAt),clock=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);if(day===p.start&&time===clock)return p.impulseStartedAt}
 return day?new Date(day+'T'+(time||'00:00')+':00-03:00').toISOString():p.impulseStartedAt||existing?.created_at||new Date().toISOString();
}
function formPlan(){const existing=state.goals.find(g=>g.id===$('#goalId').value);return {impulseResets:planOf(existing||{}).impulseResets||{},...(formKind()==='habit'&&$('#habitMeasure').value==='impulse'?{impulseStartedAt:impulseFormStart(existing)}:{}),dailyCounter:formKind()==='habit'&&$('#habitMeasure').value==='counter',skippedDays:planOf(existing||{}).skippedDays||[],dayNotes:planOf(existing||{}).dayNotes||{},...(formKind()==='habit'?{completionMode:$('#goalCompletionMode').value}:{}),impulse:formKind()==='habit'&&$('#habitMeasure').value==='impulse',agreement:$('#goalNotes').value.trim(),support:planOf(existing||{}).support||'',emoji:$('#goalEmoji').value.trim(),kind:formKind(),dailyList:isDailyList(),start:$('#goalStart').value,end:$('#goalEnd').disabled?'':$('#goalEnd').value,notes:planOf(existing||{}).notes||'',unit:formKind()==='habit'&&['quantity','counter'].includes($('#habitMeasure').value)?$('#goalDailyUnit').value.trim():$('#goalUnit').value.trim(),dailyTarget:formKind()==='habit'&&['quantity','counter'].includes($('#habitMeasure').value)?Number($('#goalDailyTarget').value):null,weekdays:[...$('#goalWeekdays').querySelectorAll('input:checked')].map(e=>Number(e.value)),tasks:formKind()==='habit'&&$('#habitMeasure').value==='tasks'?[...document.querySelectorAll('.routine-row')].map(el=>({id:el.dataset.key,title:el.querySelector('.row-title').value.trim(),weekdays:[...el.querySelectorAll('input:checked')].map(e=>Number(e.value))})):[],items:$('#goalKind').value==='list'?[...document.querySelectorAll('.item-row')].map(el=>({id:el.dataset.key,title:el.querySelector('.row-title').value.trim(),date:el.querySelector('.row-date').value})):[]}}
function outcomeLabel(g,day){const status=outcomeOf(g,day);return status==='success'?(planOf(g).impulse?'Consegui resistir':'Sucesso'):status==='skipped'?'dia pulado':status==='failure'?(planOf(g).impulse?'Cedi ao impulso':'Falha registrada'):''}
function dayOutcomeControls(g,day,canSucceed=true){
 if(planOf(g).impulse)return `<div class="day-outcome"><p class="outcome-status">${outcomeLabel(g,day)}</p><div class="outcome-actions"><button class="secondary" type="button" data-outcome="failure" data-outcome-day="${day}">registrar recaída</button>${(g.failures||[]).includes(day)?`<button class="secondary" type="button" data-outcome="clear" data-outcome-day="${day}">desfazer recaída</button>`:''}</div><p class="form-hint">o tempo corre sozinho. recaídas de dias anteriores sem horário usam meia-noite de Brasília.</p></div>`;
 canSucceed=canSucceed||day<today();
 const status=outcomeOf(g,day),base=scheduled({...g,plan:{...planOf(g),skippedDays:[]}},day),allowed=day<=today()&&base;
 return `<div class="day-outcome"><p class="outcome-status ${status||'unknown'}">${outcomeLabel(g,day)}</p><div class="outcome-actions">${canSucceed?`<button class="secondary" type="button" data-outcome="success" data-outcome-day="${day}" aria-pressed="${status==='success'}" ${!allowed?'disabled':''}>sucesso</button>`:''}${canSucceed||status!=='success'?`<button class="secondary" type="button" data-outcome="failure" data-outcome-day="${day}" aria-pressed="${status==='failure'}" ${!allowed?'disabled':''}>falha</button>`:''}<button class="secondary" type="button" data-outcome="${status==='skipped'?'clear':'skipped'}" data-outcome-day="${day}" ${!base||status==='success'?'disabled':''}>${status==='skipped'?'voltar a prever este dia':'pular dia'}</button></div><p class="form-hint">dias previstos que passaram sem conclusão contam como falha. pular o dia não conta como falha nem quebra a sequência.</p></div>`;
}
function dayNoteControls(g,day){return `<section class="day-note"><label for="dayNote">registro do dia</label><textarea id="dayNote" maxlength="2000" rows="3" placeholder="como foi esse dia para você?">${esc(planOf(g).dayNotes?.[day]||'')}</textarea><p class="form-hint">um espaço para contexto, sem julgamento. comece e recomece quantas vezes precisar.</p><button class="secondary" type="button" data-save-day-note="${day}">salvar observação</button></section>`}
function historyStart(g){return planOf(g).start||(g.created_at?localDay(new Date(g.created_at)):g.days.slice().sort()[0])||today()}
function habitDetails(g){
 return `<div class="history-toolbar"><button type="button" class="secondary" data-pick-history-date>selecionar data</button><input id="routineDay" type="date" value="${today()}" min="${historyStart(g)}" max="${today()}" aria-label="selecionar data" hidden></div><div id="historyDays"></div><div id="historyPager" class="history-pager"><div id="routineChecks" class="history-page"></div></div><div class="outcome-totals"><span>${g.days.length} sucessos</span><span>${pastPracticeDays(g,today()).filter(d=>outcomeOf(g,d)==='failure').length} falhas</span></div>`;
}
const historyDrafts=new Map();
function shiftedHistoryDay(day,amount){const date=dateFrom(day);date.setDate(date.getDate()+amount);return localDay(date)}
function historyDayTabs(g,from,to,selected){
 let html='';
 for(let day=from;day<=to;day=shiftedHistoryDay(day,1)){
  const status=outcomeOf(g,day),active=day===selected,label=day===today()?'hoje':day===dayBefore(1)?'ontem':dateFrom(day).toLocaleDateString('pt-BR',{weekday:'short'});
  html+=`<button type="button" role="tab" class="history-day ${status||''}" id="history-tab-${day}" data-history-day="${day}" aria-label="${prettyDay(day)}${outcomeLabel(g,day)?', '+outcomeLabel(g,day):''}" aria-selected="${active}" aria-controls="routineChecks" tabindex="${active?0:-1}" ${active?'autofocus':''}><span>${label}</span><strong>${dateFrom(day).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</strong><span class="history-day-mark" aria-hidden="true">${status==='success'?icon('check'):status==='failure'?icon('cross'):status==='skipped'?icon('skip'):''}</span></button>`;
 }
 return html;
}
function renderPastHistory(){
 const g=state.goals.find(g=>g.id===detailId),host=$('#historyDays');if(!g||!host)return;
 const selected=$('#routineDay').value,start=historyStart(g),end=today(),from=shiftedHistoryDay(selected,-30),to=shiftedHistoryDay(selected,14);
 host.innerHTML=`<div class="history-days" role="tablist" aria-label="dias do histórico">${historyDayTabs(g,from<start?start:from,to>end?end:to,selected)}</div>`;
 $('#routineDay').dataset.selectedDay=selected;
 const tabs=host.firstElementChild,panel=$('#routineChecks');panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`history-tab-${selected}`);
 const center=()=>{if(tabs.isConnected){const tab=tabs.querySelector('[aria-selected="true"]');if(!tab)return;tabs.scrollTo({left:tab.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-tab.offsetWidth)/2,behavior:'instant'})}};
 requestAnimationFrame(center);
 let selectionTimer;
 const selectCentered=()=>{
  if(!tabs.isConnected||state.busy)return;
  const center=tabs.getBoundingClientRect().left+tabs.clientWidth/2;
  const nearest=[...tabs.children].reduce((best,tab)=>Math.abs(tab.getBoundingClientRect().left+tab.offsetWidth/2-center)<Math.abs(best.getBoundingClientRect().left+best.offsetWidth/2-center)?tab:best);
  if(nearest.dataset.historyDay!==$('#routineDay').value)selectHistoryDay(nearest.dataset.historyDay);
 };
 tabs.addEventListener('scroll',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(selectCentered,140)},{passive:true});
 tabs.addEventListener('scrollend',selectCentered);
 renderHistoryPager(g,selected);
 tabs.addEventListener('scroll',()=>{
  const first=tabs.firstElementChild.dataset.historyDay,last=tabs.lastElementChild.dataset.historyDay;
  if(tabs.scrollLeft<100&&first>start){const before=tabs.scrollWidth,from=shiftedHistoryDay(first,-30);tabs.insertAdjacentHTML('afterbegin',historyDayTabs(g,from<start?start:from,shiftedHistoryDay(first,-1),selected));tabs.scrollLeft+=tabs.scrollWidth-before}
  if(tabs.scrollWidth-tabs.clientWidth-tabs.scrollLeft<100&&last<end){const to=shiftedHistoryDay(last,30);tabs.insertAdjacentHTML('beforeend',historyDayTabs(g,shiftedHistoryDay(last,1),to>end?end:to,selected))}
 },{passive:true});
}
let historyPageResize;
function renderHistoryPager(g,selected){
 const pager=$('#historyPager'),panel=$('#routineChecks');if(!pager||!panel)return;
 historyPageResize?.disconnect();
 pager.replaceChildren(panel);panel.dataset.pageDay=selected;
 for(const offset of [-1,1]){
  const day=shiftedHistoryDay(selected,offset);if(day<historyStart(g)||day>today())continue;
  const preview=document.createElement('div');preview.className='history-page';preview.dataset.pageDay=day;
  renderRoutineChecks(g,day,preview);
  preview.inert=true;preview.setAttribute('aria-hidden','true');
  preview.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  if(offset<0)pager.prepend(preview);else pager.append(preview);
 }
 let ready=false,timer;
 const position=()=>{
  if(!pager.isConnected)return;
  ready=false;pager.style.height=`${panel.offsetHeight}px`;
  pager.scrollTo({left:panel.offsetLeft,behavior:'instant'});
  requestAnimationFrame(()=>{ready=true});
 };
 historyPageResize=new ResizeObserver(position);historyPageResize.observe(panel);
 requestAnimationFrame(position);
 const settle=()=>{
  if(!ready||!pager.isConnected||state.busy)return;
  const page=[...pager.children].reduce((best,el)=>Math.abs(el.offsetLeft-pager.scrollLeft)<Math.abs(best.offsetLeft-pager.scrollLeft)?el:best);
  if(page.dataset.pageDay!==selected)selectHistoryDay(page.dataset.pageDay);
 };
 pager.onscroll=()=>{clearTimeout(timer);timer=setTimeout(settle,140)};
 pager.onscrollend=settle;
}
function selectHistoryDay(day,focus=false){
 const g=state.goals.find(g=>g.id===detailId),input=$('#routineDay');if(!g||!input||!validDay(day)||day<historyStart(g)||day>today())return;
 if($('#dayNote'))historyDrafts.set(`${detailId}:${input.value}`,$('#dayNote').value);
 input.value=day;input.dataset.selectedDay=day;renderRoutineChecks();renderPastHistory();
 if(focus)document.getElementById(`history-tab-${day}`)?.focus({preventScroll:true});
}
$('#progressContent').addEventListener('input',event=>{if(event.target.id==='dayNote')historyDrafts.set(`${detailId}:${$('#routineDay').value}`,event.target.value)});
$('#progressContent').addEventListener('keydown',event=>{
 const tab=event.target.closest('[role="tab"][data-history-day]');if(!tab)return;
 const g=state.goals.find(g=>g.id===detailId),day=tab.dataset.historyDay;
 const next=event.key==='ArrowLeft'?shiftedHistoryDay(day,-1):event.key==='ArrowRight'?shiftedHistoryDay(day,1):event.key==='Home'?historyStart(g):event.key==='End'?today():null;
 if(next){event.preventDefault();selectHistoryDay(next,true)}
});
function renderImpulse(g,day,host=$('#routineChecks')){
 const p=planOf(g),urges=(g.entries||[]).filter(e=>e.day===day&&e.key.startsWith('urge:'));
 host.innerHTML=`${agreementOf(g)?`<div class="impulse-support"><h3>Meu combinado</h3><p><span data-user-content>${esc(agreementOf(g))}</span></p></div>`:''}${urges.length?`<div class="impulse-moment"><h3>Vontades superadas</h3><p class="muted">${urges.length} ${urges.length===1?'vontade superada':'vontades superadas'} neste dia</p>${urges.map(e=>`<div class="plan-item"><span>${e.note?'<span data-user-content>'+esc(e.note)+'</span>':'resisti a uma vontade'}</span><button type="button" class="text-button" data-entry-key="${e.key}" data-entry-day="${day}">Remover</button></div>`).join('')}</div>`:''}${dayOutcomeControls(g,day)}`;
}
function applyDemoOutcome(g,day,status,restart=false){
 g.plan={...planOf(g),...(planOf(g).impulse?{impulseResets:{...(planOf(g).impulseResets||{}),...(status==='failure'&&(!(g.failures||[]).includes(day)||restart)?{[day]:day===today()?new Date().toISOString():day+'T00:00:00-03:00'}:{})}}:{}),skippedDays:[...(planOf(g).skippedDays||[]).filter(d=>d!==day),...(status==='skipped'?[day]:[])]};
 g.days=g.days.filter(d=>d!==day);g.failures=(g.failures||[]).filter(d=>d!==day);
 if(status==='success')g.days.push(day);if(status==='failure')g.failures.push(day);
 if(!status&&(planOf(g).tasks.length||planOf(g).dailyTarget))g.entries=(g.entries||[]).filter(e=>e.day!==day);
 if(!complete(g))g.redeemed=0;
}
async function saveOutcome(id,day,status,note,restart=false){
 if(state.busy)return;const g=state.goals.find(g=>g.id===id);if(!g)return;
 const inDetails=$('#progressDialog').open&&detailId===id,previous=progress(g);
 state.busy=true;document.querySelectorAll(`[data-id="${id}"]`).forEach(button=>button.disabled=true);
 if(inDetails)$('#progressContent').querySelectorAll('button').forEach(button=>button.disabled=true);
 try{
  if(state.demo){applyDemoOutcome(g,day,status,restart);if(note!=null)g.plan.dayNotes={...(g.plan.dayNotes||{}),[day]:note}}else Object.assign(g,await api('/'+id+'/outcome','POST',{day,status,restart,...(note!=null?{note}:{})}));
  if(note!=null)historyDrafts.delete(`${id}:${day}`);render();if(inDetails)openDetails(id,day);animateProgress(g,previous);
  if(status!=='success'||$('#milestone').hidden)toast(status==='success'?'Seu sucesso ficou registrado.':status==='failure'?planOf(g).impulse?'Recaída registrada. O contador recomeçou.':'Dia registrado. O que você já conquistou continua contando.':status==='skipped'?'Dia pulado, sem falha.':'Resultado atualizado.');
 }catch(error){toast(error.message);render();if(inDetails)openDetails(id,day)}finally{state.busy=false}
}
document.addEventListener('click',async event=>{
 const repeat=event.target.closest('[data-action="quick-repeat"]');if(repeat){
  const g=state.goals.find(g=>g.id===repeat.dataset.id),day=today();
  if(!g||state.busy||!planOf(g).dailyCounter||!scheduled(g,day))return;
  const total=dailyTotal(g,day),last=(g.entries||[]).filter(e=>e.day===day).at(-1);
  if(total>=planOf(g).dailyTarget&&!last)return;
  await changeEntry(g.id,total>=planOf(g).dailyTarget?{key:last.key,day,done:false}:{key:crypto.randomUUID(),day,value:1,done:true},false);return;
 }
 const annotation=event.target.closest('[data-action="annotate"]');if(annotation){openDetails(annotation.dataset.id,today());$('#dayNote')?.focus();return}
 const relapse=event.target.closest('[data-action="impulse-relapse"]');if(relapse){await saveOutcome(relapse.dataset.id,today(),'failure',undefined,true);return}
 const button=event.target.closest('[data-action="quick-outcome"]');if(!button)return;
 const g=state.goals.find(g=>g.id===button.dataset.id);if(!g)return;
 const requested=button.dataset.status;
 await saveOutcome(g.id,today(),outcomeOf(g,today())===requested?null:requested);
});
$('#progressContent').addEventListener('click',async event=>{
 const counter=event.target.closest('[data-add-repeat],[data-undo-repeat]');if(counter){const g=state.goals.find(g=>g.id===detailId),day=$('#routineDay').value,last=(g.entries||[]).filter(e=>e.day===day).at(-1);await changeEntry(detailId,counter.hasAttribute('data-add-repeat')?{key:crypto.randomUUID(),day,value:1,done:true}:{key:last.key,day,done:false});return}
 const picker=event.target.closest('[data-pick-history-date]');if(picker){const input=$('#routineDay');input.hidden=!input.hidden;if(!input.hidden)input.focus();return}
 const tab=event.target.closest('[data-history-day]');if(tab){selectHistoryDay(tab.dataset.historyDay,true);return}

 const note=event.target.closest('[data-save-day-note]');if(note){const g=state.goals.find(g=>g.id===detailId);await saveOutcome(detailId,note.dataset.saveDayNote,outcomeOf(g,note.dataset.saveDayNote),$('#dayNote').value);return}
 const outcome=event.target.closest('[data-outcome]');if(outcome){await saveOutcome(detailId,outcome.dataset.outcomeDay,outcome.dataset.outcome==='clear'?null:outcome.dataset.outcome,$('#dayNote')?.value);return}
});

let detailId,quickDailyList=false;
function openDetails(id,day,compact=false){clearItemCelebration();detailId=id;const g=state.goals.find(g=>g.id===id);if(!g)return;const p=planOf(g);quickDailyList=compact&&!!p.dailyList;$('#progressDialog').classList.toggle('quick-daily-list',quickDailyList);$('#progressDialog').classList.toggle('daily-list-dialog',!!p.dailyList);$('#progressTitle').textContent=g.title;$('#progressSubtitle').textContent=agreementOf(g);$('#progressSubtitle').hidden=p.impulse||!agreementOf(g);let html=`<p class="deadline">${deadline(g)}</p>`;if(p.kind==='list'){html+=`<p class="muted">${progress(g)} de ${targetOf(g)} etapas concluídas. A data planejada pode ser futura; marque quando concluir.</p><label for="entryDay">Data de conclusão</label><input id="entryDay" type="date" value="${today()}" min="${historyStart(g)}" max="${today()}"><div class="plan-items">${p.items.map(i=>{const e=(g.entries||[]).find(e=>e.key===i.id);return `<div class="plan-item"><div><strong>${esc(i.title)}</strong><small>${i.date?'Planejado: '+prettyDay(i.date):'Sem data'}${e?' · Feito: '+prettyDay(e.day):''}</small></div><button class="secondary" data-entry-key="${i.id}" aria-pressed="${!!e}">${e?'Desfazer':'Concluir'}</button></div>`}).join('')}</div>`}else if(p.kind==='amount'){html+=`<p data-user-content>${esc(progressText(g))}</p><form id="amountForm"><label for="entryValue">Quanto você avançou (<span data-user-content>${esc(unit(g))}</span>)?</label><input id="entryValue" type="number" min="0.01" max="1000000000" step="0.01" required><label for="entryDay">Data do registro</label><input id="entryDay" type="date" value="${today()}" min="${historyStart(g)}" max="${today()}" required><label for="entryNote">Anotação (opcional)</label><input id="entryNote" maxlength="300"><button class="primary wide" type="submit">Adicionar progresso</button></form><h3>Seu histórico</h3>${(g.entries||[]).slice().reverse().map(e=>`<div class="plan-item"><div><strong data-user-content>${esc(amountText(g,e.value))}</strong><small>${prettyDay(e.day)}${e.note?' · <span data-user-content>'+esc(e.note)+'</span>':''}</small></div><button class="text-button" data-entry-key="${e.key}">Remover</button></div>`).join('')||'<p class="muted">Seus primeiros passos vão aparecer aqui.</p>'}`}else{html=quickDailyList?`<input id="routineDay" type="hidden" value="${day||today()}"><div id="routineChecks"></div><button class="secondary daily-list-done" data-close="progressDialog">pronto</button>`:habitDetails(g)+html}if(g.reward&&!quickDailyList)html+=`<section class="detail-reward"><h3>Minha recompensa</h3><p data-user-content>${esc(g.reward)}</p></section>`;$('#progressContent').innerHTML=html;if(p.kind==='list'&&day&&day<=today())$('#entryDay').value=day;if(p.kind==='habit'){if(day)$('#routineDay').value=day<historyStart(g)?historyStart(g):day>today()?today():day;renderRoutineChecks();renderPastHistory()}if(!$('#progressDialog').open)showDialog($('#progressDialog'))}
function renderRoutineChecks(g=state.goals.find(g=>g.id===detailId),day=$('#routineDay').value,host=$('#routineChecks')){
 if(!validDay(day))return;
 const p=planOf(g);
 if(p.impulse){renderImpulse(g,day,host);prependDayNote(g,day,host);return}
 if(p.dailyTarget){renderDailyQuantity(g,day,host);prependDayNote(g,day,host);return}
 if(!p.tasks.length){host.innerHTML=dayOutcomeControls(g,day);prependDayNote(g,day,host);return}
 const tasks=tasksOn(g,day),allowed=day<=today()&&scheduled(g,day);
 host.innerHTML=tasks.length?tasks.map(task=>{
  const key=`${day}:${task.id}`,done=(g.entries||[]).some(entry=>entry.key===key);
  if(p.dailyList)return `<button type="button" class="secondary daily-list-item" data-entry-key="${key}" data-entry-day="${day}" aria-pressed="${done}" ${!allowed&&!done?'disabled':''}><span class="daily-list-tick" aria-hidden="true">${done?icon('check'):''}</span><span data-user-content>${esc(task.title)}</span></button>`;
  return `<div class="plan-item"><strong>${esc(task.title)}</strong><button class="secondary" data-entry-key="${key}" data-entry-day="${day}" aria-pressed="${done}" ${!allowed&&!done?'disabled':''}>${p.dailyList?`${done?icon('check'):''}${done?'Feito':'Marcar'}`:done?'Desfazer':'Fiz'}</button></div>`;
 }).join(''):'<p class="muted">Nenhuma tarefa prevista para este dia.</p>';
 host.insertAdjacentHTML('beforeend',dailyItemProgress(g,day));
 host.insertAdjacentHTML('beforeend',dayOutcomeControls(g,day,false));
 prependDayNote(g,day,host);
 if(!allowed)host.insertAdjacentHTML('beforeend','<p class="muted">Este dia está fora da rotina, do período ou ainda não chegou.</p>');
}
function prependDayNote(g,day,host=$('#routineChecks')){if(!quickDailyList){host.insertAdjacentHTML('afterbegin',dayNoteControls(g,day));const outcome=host.querySelector('.day-outcome');if(outcome)host.prepend(outcome);const draft=historyDrafts.get(`${g.id}:${day}`);if(draft!=null)host.querySelector('#dayNote').value=draft}}
let itemCelebrationTimer;
function clearItemCelebration(){clearTimeout(itemCelebrationTimer);$('#itemMilestone')?.remove()}
function magicalEmblem(motif,kind='day'){const edition=window.DreamThemes?.current,art=edition?.celebrationAsset;if(art){const first=kind==='item'?0:4,count=kind==='item'?4:kind==='dream'?12:8;const frames=Array.from({length:count},(_,i)=>{const pose=first+i,row=Math.floor(pose/4),y=row===3?(edition.celebrationFinalRow??100):row*100/3;return `<span class="celebration-frame ${i===0?'first-frame':i===count-1?'last-frame':''}" style="background-position:${pose%4*100/3}% ${y}%;animation-delay:${i*160}ms"></span>`}).join('');return `<div class="milestone-enchantment painted-enchantment" data-scene="${kind}" style="--celebration-art:url('${esc(art)}');--atlas-final-y:${edition.celebrationFinalRow??100}%"><div class="milestone-aura"></div><div class="potion-sprite">${frames}</div><div class="painted-glints">${Array.from({length:6},(_,i)=>`<span style="--glint-delay:${i*180}ms;--glint-x:${[22,76,15,83,30,68][i]}%;--glint-y:${[32,24,60,57,80,78][i]}%">${icon('star')}</span>`).join('')}</div></div>`}return `<div class="milestone-enchantment"><div class="milestone-aura"></div><div class="milestone-sigil">${icon(motif)}</div><div class="milestone-sparks">${Array.from({length:12},(_,i)=>`<span style="--spark-x:${Math.round(Math.cos(i*Math.PI/6)*140)}px;--spark-y:${Math.round(Math.sin(i*Math.PI/6)*115)}px;--spark-delay:${i*45}ms;--spark-turn:${i%2?24:-24}deg">${icon(i%3===0?motif:'star')}</span>`).join('')}</div></div>`}
function celebrateDailyListItem(g,entry){
 const p=planOf(g),inDialog=$('#progressDialog').open,measured=!!p.dailyTarget;
 if(!p.dailyList&&!measured||!inDialog&&(!measured||dayDone(g,entry.day))||measured&&entry.day!==today())return false;
 const tasks=tasksOn(g,entry.day),item=tasks.find(t=>entry.key===`${entry.day}:${t.id}`);
 if(!measured&&!item)return false;
 clearItemCelebration();
 const count=measured?dailyTotal(g,entry.day):tasks.filter(t=>(g.entries||[]).some(e=>e.key===`${entry.day}:${t.id}`)).length,target=measured?p.dailyTarget:tasks.length,finished=count>=target,edition=window.DreamThemes?.current;
 const title=finished?(measured?'Meta do dia concluída!':'Lista do dia concluída!'):measured?'Mais uma medida registrada!':'Mais um cuidado cumprido!';
 const text=measured?g.title:item.title,caption=measured?`${fmt(count)} de ${fmt(target)} ${p.unit||'repetições'} hoje`:`${count} de ${target} itens · ${entry.day===today()?'hoje':prettyDay(entry.day)}`;
 const content=`${magicalEmblem(edition?.progressSymbol||'star',finished?'day':'item')}${finished?rewardFusion(measured?Math.ceil(count):tasks.length):''}<div class="milestone-copy"><h2>${title}</h2><p data-user-content>${esc(text)}</p><p class="item-completion-count" data-user-content>${esc(caption)}</p></div>`;
 if(inDialog){
  const panel=document.createElement('section');panel.id='itemMilestone';panel.className='milestone item-milestone'+(finished?'':' reward-item-feedback');panel.dataset.magic=edition?.atmosphere||'stars';panel.setAttribute('role','status');panel.innerHTML=content;const fusion=panel.querySelector('.reward-fusion');if(fusion)panel.querySelector('.milestone-enchantment').append(fusion);
  $('#progressDialog').append(panel);itemCelebrationTimer=setTimeout(clearItemCelebration,finished?4500:1700);
 }else{
  const panel=$('#milestone');panel.dataset.goal=g.id;panel.dataset.magic=edition?.atmosphere||'stars';panel.dataset.edition=edition?.id||'';panel.classList.remove('final-chapter','has-practice-achievement');
  panel.innerHTML=`<button class="icon-button milestone-close" data-action="dismiss-milestone" aria-label="Fechar celebração">×</button>${content}<button class="secondary" data-action="dismiss-milestone">Continuar</button>`;
  const fusion=panel.querySelector('.reward-fusion');if(fusion)panel.querySelector('.milestone-enchantment').append(fusion);
  panel.hidden=false;showMilestone();clearTimeout(milestoneTimer);milestoneTimer=setTimeout(dismissMilestone,3400);
 }
 $('#toast').hidden=true;clearTimeout(toastTimer);return true;
}
$('#progressDialog').addEventListener('close',clearItemCelebration);
async function changeEntry(id,body,showDetails=true){if(state.busy)return;const g=state.goals.find(g=>g.id===id),previous=progress(g),origin=rewardOrigin(),newItem=body.done&&!(g.entries||[]).some(e=>e.key===body.key);state.busy=true;document.querySelectorAll(`[data-id="${id}"]`).forEach(b=>b.disabled=true);$('#progressContent').querySelectorAll('button').forEach(b=>b.disabled=true);try{if(state.demo){g.entries=(g.entries||[]).filter(e=>e.key!==body.key);if(body.done)g.entries.push({key:body.key,day:body.day,value:body.value||1,note:body.note||''});if(planOf(g).kind==='habit'&&!planOf(g).impulse){g.days=g.days.filter(d=>d!==body.day);if(planOf(g).dailyTarget?dailyTotal(g,body.day)>=planOf(g).dailyTarget:tasksOn(g,body.day).every(t=>g.entries.some(e=>e.key===`${body.day}:${t.id}`)))g.days.push(body.day);if(g.days.includes(body.day))g.failures=(g.failures||[]).filter(d=>d!==body.day)}g.redeemed=0}else Object.assign(g,await api('/'+id+'/entry','POST',body));render();if(showDetails)openDetails(id,body.day,quickDailyList);if(showDetails&&$('#routineDay')){$('#routineDay').value=body.day;renderRoutineChecks()}if(newItem)document.querySelectorAll('[data-progress-key]').forEach(step=>{if(step.dataset.progressKey===body.key)step.classList.add('just-completed')});animateProgress(g,previous);const itemCelebrated=newItem&&celebrateDailyListItem(g,body);rewardEntryFeedback(g,body,newItem,origin);if(!itemCelebrated&&(!body.done||$('#milestone').hidden))toast(body.done?'Mais um passo registrado.':'Registro desfeito.')}catch(e){toast(e.message);if(showDetails)openDetails(id);else render()}finally{state.busy=false}}
function selectDailyList(){
 if(!$('#listFields').hidden&&!($('#goalStart').value&&$('#goalEnd').value))$('#goalTarget').value='';
 $('#goalKind').value='daily-list';
 if(!$('#routineRows').children.length){for(const row of document.querySelectorAll('.item-row'))addRoutineRow({id:row.dataset.key,title:row.querySelector('.row-title').value,weekdays:[...$('#goalWeekdays').querySelectorAll('input:checked')].map(input=>Number(input.value))});}
 syncKind();syncDuration();
}
$('#repeatList').addEventListener('click',()=>{if(!$('#goalKind').disabled)selectDailyList()});
$('#goalKind').addEventListener('change',()=>{if(isDailyList())selectDailyList();else{syncKind();syncDuration()}});
$('#habitMeasure').addEventListener('change',syncKind);
$('#addRoutine').addEventListener('click',()=>{addRoutineRow();document.querySelector('.routine-row:last-child .row-title').focus()});
$('#addItem').addEventListener('click',()=>addItemRow());
$('#goalForm').addEventListener('click',e=>{
 if(e.target.closest('.remove-row')){e.target.closest('.routine-row,.item-row').remove();updateTaskSummaries()}
 if(e.target.closest('.finish-task')){const row=e.target.closest('.routine-row'),input=row.querySelector('.row-title');if(!input.reportValidity())return;if(!row.querySelector('input[type="checkbox"]:checked')){toast('Escolha os dias desta tarefa.');return}row.open=false;updateTaskSummaries()}
});
$('#goalForm').addEventListener('input',updateTaskSummaries);
$('#goalForm').addEventListener('change',updateTaskSummaries);
$('#goalForm').addEventListener('input',event=>{if(event.target.matches('#goalStart,#goalEnd,#goalCompletionMode,#goalWeekdays input'))syncDuration()});
$('#goalForm').addEventListener('change',event=>{if(event.target.matches('#goalStart,#goalEnd,#goalCompletionMode,#goalWeekdays input'))syncDuration()});
$('#goalForm').addEventListener('invalid',e=>{const row=e.target.closest('.routine-row');if(row)row.open=true},true);

$('#progressContent').addEventListener('change',e=>{if(e.target.id==='routineDay'){const requested=e.target.value,valid=e.target.checkValidity();e.target.value=e.target.dataset.selectedDay||today();selectHistoryDay(valid&&requested?requested:e.target.value)}});
$('#progressContent').addEventListener('click',async e=>{const b=e.target.closest('[data-entry-key],[data-routine-day]');if(!b)return;if(b.dataset.routineDay){const day=b.dataset.routineDay;await changeDay(detailId,day);openDetails(detailId);$('#routineDay').value=day;renderRoutineChecks();return}const g=state.goals.find(g=>g.id===detailId),entry=(g.entries||[]).find(e=>e.key===b.dataset.entryKey),day=b.dataset.entryDay||entry?.day||$('#entryDay')?.value||today();await changeEntry(detailId,{key:b.dataset.entryKey,day,done:!entry});if($('#routineDay')&&b.dataset.entryDay){$('#routineDay').value=day;renderRoutineChecks()}});
$('#progressContent').addEventListener('submit',async e=>{if(e.target.id!=='amountForm')return;e.preventDefault();await changeEntry(detailId,{key:crypto.randomUUID(),day:$('#entryDay').value,value:Number($('#entryValue').value),note:$('#entryNote').value.trim(),done:true})});
function renderDailyQuantity(g,day,host=$('#routineChecks')){
 const p=planOf(g),total=dailyTotal(g,day),allowed=day<=today()&&scheduled(g,day),entries=(g.entries||[]).filter(e=>e.day===day),remaining=Math.max(0,p.dailyTarget-total);
 host.innerHTML=`<p class="daily-summary">${fmt(total)} de ${fmt(p.dailyTarget)} <span data-user-content>${esc(p.unit)}</span> · ${g.days.includes(day)?'Dia feito':`${remaining===1?'Falta':'Faltam'} ${fmt(remaining)} ${p.dailyCounter?(remaining===1?'repetição':'repetições'):`<span data-user-content>${esc(p.unit)}</span>`}`}</p><div class="progress" role="progressbar" aria-label="Quantidade do dia" aria-valuemin="0" aria-valuemax="${p.dailyTarget}" aria-valuenow="${Math.min(total,p.dailyTarget)}"><span style="width:${Math.min(100,total/p.dailyTarget*100)}%">${progressToken()}</span></div>${allowed&&p.dailyCounter?`<div class="counter-controls"><button type="button" class="primary" data-add-repeat aria-label="Registrar ocorrência · ${fmt(total)}/${fmt(p.dailyTarget)} concluídas" ${total>=p.dailyTarget?'disabled':''}>${icon('check')}${fmt(total)}/${fmt(p.dailyTarget)}</button><button type="button" class="secondary" data-undo-repeat ${!entries.length?'disabled':''}>desfazer</button></div>`:allowed?`<form id="dailyAmountForm"><label for="dailyValue">Adicionar quantidade (<span data-user-content>${esc(p.unit)}</span>)</label><input id="dailyValue" type="number" min="0.01" max="1000000000" step="0.01" required><button class="primary wide" type="submit">Registrar quantidade</button></form>`:'<p class="muted">Este dia está fora da rotina, do período ou ainda não chegou.</p>'}<div>${entries.map(e=>`<div class="plan-item"><strong>${fmt(e.value)} <span data-user-content>${esc(p.unit)}</span></strong><button class="text-button" data-entry-key="${e.key}" data-entry-day="${day}">Remover</button></div>`).join('')}</div>${dayOutcomeControls(g,day,false)}`;
}
$('#progressContent').addEventListener('submit',async e=>{if(e.target.id!=='dailyAmountForm')return;e.preventDefault();await changeEntry(detailId,{key:crypto.randomUUID(),day:$('#routineDay').value,value:Number($('#dailyValue').value),done:true})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="details"],[data-action="history"],[data-action="record"],[data-action="daily-list-check"]');if(b){const g=state.goals.find(g=>g.id===b.dataset.id);openDetails(b.dataset.id,b.dataset.day||(b.matches('.diary-button,[data-action="history"]')?(historyStart(g)>dayBefore(1)?historyStart(g):dayBefore(1)):today()),b.dataset.action==='daily-list-check');}});

// The shelf is derived from persisted records, independent of reward redemption or edition.
function completionDay(g){
 const p=planOf(g),target=targetOf(g);
 if(p.kind==='habit')return habitCompletionDay(g);
 const entries=(g.entries||[]).filter(e=>p.kind!=='list'||p.items.some(i=>i.id===e.key)).slice().sort((a,b)=>a.day.localeCompare(b.day));
 let total=0;const seen=new Set();
 for(const e of entries){if(p.kind==='list'){if(seen.has(e.key))continue;seen.add(e.key);total++}else total=Math.round((total+e.value)*100)/100;if(total>=target)return e.day}
 return '';
}
function bookMarkup(g){return `<div class="dream-book ${esc(g.color)}">${rewardBookFinish(g)}<span class="book-symbol">${goalEmoji(g)}</span><h3>${esc(g.title)}</h3><span class="book-seal">${icon('check')} Tydream realizado</span></div>`}
let collectionView='shelf',shelfPage=null,selectedShelfBook=null,selectedWriter=null,shelfRender=0;
function shelfDemo(count){
 resetMilestonePanel();state.demo=true;state.groups=[];state.view='shelf';collectionView='shelf';shelfPage=0;selectedShelfBook=null;
 const titles=['Ler antes de dormir','Cuidar das minhas plantas','Movimentar meu corpo','Aprender algo novo','Um momento só meu','Escrever um pouco','Preparar uma receita','Caminhar ao ar livre'];
 state.goals=titles.slice(0,count).map((title,i)=>({id:'shelf-demo-'+i,title,target:1,color:['lavender','peach','sage'][i%3],days:[dayBefore(8-i)],entries:[],reward:i===0?'Um livro novo, escolhido sem pressa':'',redeemed:0,created_at:'2026-01-01T00:00:00Z'}));
 seedMilestones();render();
}
async function renderShelf(){
 const token=++shelfRender,books=state.goals.filter(complete).sort((a,b)=>completionDay(a).localeCompare(completionDay(b))||(a.created_at||'').localeCompare(b.created_at||'')||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(books.length/8));shelfPage=Math.max(0,Math.min(shelfPage??Math.max(0,Math.ceil(books.length/8)-1),pages-1));
 const nav=`<div class="collection-tabs" role="group" aria-label="Sua coleção"><button class="secondary" data-action="collection-achievements" aria-pressed="${collectionView==='achievements'}">conquistas</button><button class="secondary" data-action="collection-shelf" aria-pressed="${collectionView==='shelf'}">Prateleira</button><button class="secondary" data-action="collection-album" aria-pressed="${collectionView==='album'}">escritores</button></div>`;
 if(collectionView==='achievements'){$('#content').innerHTML=`<section class="writer-collection">${nav}${achievementsMarkup()}</section>`;return}
 const focused=document.activeElement?.closest('[data-action]');
 const focusKey=focused?{action:focused.dataset.action,id:focused.dataset.id,writer:focused.dataset.writer}:null;
 if(!$('#content .writer-collection'))$('#content').innerHTML=`<section class="writer-collection">${nav}<p role="status">Abrindo sua coleção…</p></section>`;
 let album;
 try{album=await api('/album'+(state.demo?'?demo=1':''))}catch(error){if(token!==shelfRender||state.view!=='shelf')return;$('#content').innerHTML=`<section class="writer-collection">${nav}<p role="alert">${esc(error.message)}</p><button class="secondary" data-action="collection-retry">Tentar novamente</button></section>`;return}
 if(token!==shelfRender||state.view!=='shelf')return;
 // Demo metadata is limited to the first writer; a partial example still hides it.
 if(state.demo)album.slots=album.slots.map((slot,i)=>i===0&&books.length<8?{id:slot.id,index:0,unlocked:false}:slot);
 const unlocked=album.slots.filter(w=>w.unlocked),batch=books.slice(shelfPage*8,shelfPage*8+8),writer=album.slots[shelfPage];
 if(!unlocked.some(w=>w.id===selectedWriter))selectedWriter=unlocked.at(-1)?.id||null;
 const active=album.slots.find(w=>w.id===selectedWriter);
 const portrait=state.demo?'/api/goals/portraits/demo':'/api/goals/portraits/'+writer?.id;
 const selected=batch.find(g=>g.id===selectedShelfBook);
 const record=selected?`<div class="shelf-selected" aria-live="polite"><span class="goal-symbol">${goalEmoji(selected)}</span><h3>${esc(selected.title)}</h3><p>Concluído em ${prettyDay(completionDay(selected))}</p><p><span data-user-content>${esc(amountText(selected,progress(selected)))}</span> realizados</p>${selected.reward?`<p>${icon('gift')} <span data-user-content>${esc(selected.reward)}</span></p>`:''}<div class="book-actions"><button class="secondary" data-action="details" data-id="${selected.id}">histórico</button><button class="secondary" data-action="edit" data-id="${selected.id}">Editar tydream</button></div></div>`:`<div class="shelf-intro"><h3>${batch.length===8?'Uma história inteira, feita de pequenos passos.':'Cada sonho realizado revela um pedaço.'}</h3><p>${batch.length===8?'Os oito livros se encontraram. Seu retrato já está guardado no álbum.':batch.length?`Faltam ${8-batch.length} tydreams para completar este retrato.`:'Ao concluir um tydream, seu primeiro livro aparece aqui.'}</p><p>Toque em um livro para revisitar a conquista.</p>${batch.length===8&&writer?'<button class="primary" data-action="collection-album">Abrir meu álbum</button>':''}</div>`;
 const shelf=`<div class="shelf-heading"><h2>prateleira</h2><p>Oito tydreams, um retrato. Uma coleção para guardar suas histórias.</p></div><div class="writer-shelf-layout"><div class="shelf-display"><div class="portrait-bookcase" aria-label="${batch.length} de 8 livros nesta prateleira">${Array.from({length:8},(_,i)=>{const g=batch[i];return g?`<button class="portrait-spine ${g.id===selectedShelfBook?'selected':''}" data-action="shelf-book" data-id="${g.id}" aria-label="${esc(g.title)}. Livro ${i+1} de 8" aria-pressed="${g.id===selectedShelfBook}">${writer?`<span class="spine-art" style="background-image:url('${portrait}');background-position:${i%4*100/3}% ${Math.floor(i/4)*100}%" aria-hidden="true"></span>`:`<span class="spine-art" aria-hidden="true">${goalEmoji(g)}</span>`}<span class="spine-caption">${esc(g.title)}</span><span class="spine-journey-mark" aria-label="meta conquistada">${goalEmoji(g)}</span></button>`:`<div class="portrait-spine locked-spine" aria-label="Livro ${i+1} ainda não conquistado">${icon('book')}<span>${i+1}</span></div>`}).join('')}</div><p class="shelf-progress">${batch.length} de 8 livros${writer?.unlocked?' · retrato revelado':''}</p><div class="shelf-pagination"><button class="secondary" data-action="shelf-prev" ${shelfPage===0?'disabled':''}>Anterior</button><span>Prateleira ${shelfPage+1}</span><button class="secondary" data-action="shelf-next" ${shelfPage>=pages-1?'disabled':''}>Próxima</button></div></div>${record}</div>`;
 const albumView=`<div class="shelf-heading"><h2>escritores</h2><p>${unlocked.length} de 10 retratos conquistados · sua coleção atravessa os temas.</p></div><div class="writer-open-album ${active?'has-writer':''}"><div class="album-portrait-page">${active?`<img class="writer-portrait" src="${active.portrait}" alt="Retrato ilustrado de ${esc(active.name)}"><p>Retrato ${active.index+1} da coleção</p>`:`<div class="album-empty-portrait">${icon('book')}<p>Uma nova história<br>espera por você.</p></div>`}</div><div class="album-biography">${active?`<h3>${esc(active.name)}</h3><p class="writer-origin">${esc(active.country)}<br>${esc(active.years)}</p><p>${esc(active.bio)}</p><h4>Obras mais conhecidas</h4><ul>${active.works.map(work=>`<li>${esc(work)}</li>`).join('')}</ul><a class="secondary writer-source" href="${esc(active.source)}" target="_blank" rel="noopener noreferrer">Conhecer sua história ↗</a>`:`<h3>Grandes escritores.<br>Pequenas conquistas.</h3><p>A cada oito tydreams realizados, um retrato completo ganha lugar neste álbum, com sua história e obras.</p><p>São dez encontros com a literatura de diferentes países. Os próximos nomes são surpresa.</p><button class="secondary" data-action="collection-shelf">Voltar à prateleira</button>`}</div></div><div class="writer-album-slots" aria-label="Dez lugares no álbum">${album.slots.map(w=>w.unlocked?`<button class="writer-album-slot unlocked ${w.id===selectedWriter?'selected':''}" data-action="select-writer" data-writer="${w.id}" aria-pressed="${w.id===selectedWriter}"><img src="${w.portrait}" alt="" loading="lazy"><span>${esc(w.name)}</span></button>`:`<div class="writer-album-slot sealed">${icon('book')}<span>Por descobrir</span><small>${Math.max(0,(w.index+1)*8-books.length)} tydreams</small></div>`).join('')}</div>`;
 $('#content').innerHTML=`<section class="writer-collection">${nav}${collectionView==='album'?albumView:shelf}</section>`;
 if(focusKey){const match=[...document.querySelectorAll('#content [data-action]')].find(b=>b.dataset.action===focusKey.action&&b.dataset.id===focusKey.id&&b.dataset.writer===focusKey.writer);match?.focus({preventScroll:true})}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='completed-shelf'){const books=state.goals.filter(complete).sort((a,b)=>completionDay(a).localeCompare(completionDay(b))||(a.created_at||'').localeCompare(b.created_at||'')||a.id.localeCompare(b.id));selectedShelfBook=b.dataset.id;shelfPage=Math.floor(books.findIndex(g=>g.id===selectedShelfBook)/8);collectionView='shelf';state.view='shelf';render()}
 if(action==='collection-achievements'){collectionView='achievements';renderShelf()}
 if(action==='collection-shelf'||action==='collection-album'){collectionView=action==='collection-album'?'album':'shelf';renderShelf()}
 if(action==='collection-retry')renderShelf();
 if(action==='shelf-book'){selectedShelfBook=b.dataset.id;renderShelf()}
 if(action==='select-writer'){selectedWriter=b.dataset.writer;renderShelf()}
 if(action==='shelf-prev'||action==='shelf-next'){shelfPage+=action==='shelf-next'?1:-1;selectedShelfBook=null;renderShelf()}
});
const milestoneQueue=new Map(),milestoneMemory=new Set();
const tydreamCongratulations=[
 'parabéns! mais um passo para o seu sonho.',
 'seu esforço merece ser celebrado!',
 'um pequeno passo, uma conquista sua.',
 'mais uma página bonita na sua história.',
 'você cuidou do seu sonho. celebre!',
 'essa conquista é sua. aproveite o momento!',
 'seu próximo capítulo está mais perto.',
 'um pouquinho de magia, um tanto de dedicação.'
];
let lastCongratulations=-1;
function randomCongratulations(){
 const next=Math.floor(Math.random()*(tydreamCongratulations.length-(lastCongratulations<0?0:1)));
 lastCongratulations=next>=lastCongratulations&&lastCongratulations>=0?next+1:next;
 return tydreamCongratulations[lastCongratulations];
}
let milestoneTimer;
function showMilestone(){
 const dialog=$('#milestoneDialog');if(dialog.open)return;
 const scrollY=window.scrollY;
 showDialog(dialog);document.documentElement.classList.add('milestone-open');syncModalScroll(scrollY);
}
function dismissMilestone(returnSeal=true){
 const returning=returnSeal?rewardSealReturn():null;
 clearTimeout(milestoneTimer);$('#milestone').hidden=true;
 const dialog=$('#milestoneDialog');if(!dialog.open)return;
 dialog.close();document.documentElement.classList.remove('milestone-open');syncModalScroll();rewardReturnToGrid(returning);
}
$('#milestoneDialog').addEventListener('click',event=>{if(event.target===$('#milestoneDialog'))dismissMilestone()});
$('#milestoneDialog').addEventListener('cancel',event=>{event.preventDefault();dismissMilestone()});
function resetMilestonePanel(){rewardReset();milestoneQueue.clear();clearTimeout(milestoneTimer);dismissMilestone(false)}
function milestoneKey(key){return `${state.demo?'demo':'real'}:${key}`}
function milestoneSeen(key){const k=milestoneKey(key);try{return milestoneMemory.has(k)||localStorage.getItem('tiny-dreams-celebrated:'+k)==='1'}catch{return milestoneMemory.has(k)}}
function rememberMilestone(key){const k=milestoneKey(key);milestoneMemory.add(k);if(!state.demo)try{localStorage.setItem('tiny-dreams-celebrated:'+k,'1')}catch{}}
function seedMilestones(){for(const g of state.goals){if(complete(g))rememberMilestone('dream:'+g.id);if(dayDone(g,today()))rememberMilestone('day:'+g.id+':'+today())}}
function celebrateMilestone(g,previous){
 if(progress(g)<=previous){milestoneQueue.delete(g.id);if($('#milestone').dataset.goal===g.id)dismissMilestone(false);rewardCancelFlights();return}
 if(complete(g)&&previous<targetOf(g)&&!milestoneSeen('dream:'+g.id))milestoneQueue.set(g.id,{id:g.id,kind:'dream'});
 else if(planOf(g).impulse&&(practiceAchievement(g)||rewardSequence(g).record||rewardSequence(g).resumed)&&!milestoneSeen(rewardIntervalKey(g)))milestoneQueue.set(g.id,{id:g.id,kind:'interval',value:progress(g),key:rewardIntervalKey(g)});
 else if(planOf(g).kind==='habit'&&dayDone(g,today())&&!milestoneSeen('day:'+g.id+':'+today()))milestoneQueue.set(g.id,{id:g.id,kind:'day',day:today()});
 flushMilestones();
}
function flushMilestones(){
 if(document.hidden||document.querySelector('dialog[open]'))return;
 const candidates=[...milestoneQueue.values()].filter(m=>{const g=state.goals.find(g=>g.id===m.id);return g&&(m.kind==='dream'?complete(g):m.kind==='interval'?planOf(g).impulse&&progress(g)===m.value:m.day===today()&&dayDone(g,today()))});milestoneQueue.clear();
 if(!candidates.length)return;
 const m=candidates.find(m=>m.kind==='dream')||candidates.at(-1),g=state.goals.find(g=>g.id===m.id);
 for(const item of candidates){rememberMilestone(item.key||(item.kind==='dream'?'dream:'+item.id:'day:'+item.id+':'+today()));if(item.kind==='dream')rememberMilestone('day:'+item.id+':'+today())}
 const habits=state.goals.filter(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&(!complete(g)||dayDone(g,today())));
 const allToday=habits.length&&habits.every(g=>dayDone(g,today())),wholeDay=allToday&&!milestoneSeen('today:'+today());
 if(wholeDay&&m.kind!=='dream')rememberMilestone('today:'+today());
 const edition=window.DreamThemes?.current;
 const motif=edition?.progressSymbol||'star',atmosphere=edition?.atmosphere||'stars';
 const panel=$('#milestone');panel.dataset.goal=g.id;panel.dataset.magic=atmosphere;panel.dataset.edition=edition?.id||'';panel.classList.toggle('final-chapter',m.kind==='dream');
 const enchantment=magicalEmblem(motif,m.kind),achievement=rewardHonor(g);
 if(wholeDay)rewardWholeDayFeedback();
 panel.classList.toggle('has-practice-achievement',!!achievement);
 panel.innerHTML=`<button class="icon-button milestone-close" data-action="dismiss-milestone" aria-label="Fechar celebração">×</button>${enchantment}${achievement}<div class="milestone-copy"><h2>${m.kind==='dream'?'Mais uma história realizada.':rewardHeading(g,wholeDay?'Tudo de hoje concluído.':randomCongratulations())}</h2><p>${m.kind==='dream'?esc(g.title):wholeDay?`${habits.length} hábitos de hoje concluídos.`:`${esc(g.title)} · ${fmt(progress(g))} de ${fmt(targetOf(g))} <span data-user-content>${esc(unit(g))}</span>`}</p>${m.kind==='dream'&&g.reward?`<p>Recompensa liberada: <span data-user-content>${esc(g.reward)}</span></p>`:''}<button class="secondary" data-action="${m.kind==='dream'?'open-achievements':'dismiss-milestone'}">${m.kind==='dream'?'Ver minhas conquistas':'Continuar'}</button></div>`;
 const honor=panel.querySelector('.practice-achievement');if(honor)panel.querySelector('.milestone-enchantment').append(honor);
 panel.querySelector('.milestone-enchantment').insertAdjacentHTML('beforeend',rewardPeek(g));
 $('#toast').hidden=true;clearTimeout(toastTimer);panel.hidden=false;showMilestone();clearTimeout(milestoneTimer);if(m.kind!=='dream')milestoneTimer=setTimeout(dismissMilestone,6000);
}
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='open-achievements')openAchievements();if(action==='dismiss-milestone')dismissMilestone();if(action==='open-shelf'||action==='back-dreams'){dismissMilestone();state.view=action==='open-shelf'?'shelf':'dreams';render();$('#content').scrollIntoView({block:'start'});document.querySelector(`[data-view="${state.view}"]`).focus()}});
new MutationObserver(flushMilestones).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
document.addEventListener('visibilitychange',flushMilestones);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#milestone').hidden){dismissMilestone();clearTimeout(milestoneTimer)}});
// A curated selection: change the list only when the user requests new quotations.
const welcomePhrases=[
 {id:'reis-inteiro',text:'Põe quanto és no mínimo que fazes.',author:'Ricardo Reis (Fernando Pessoa)',work:'Odes · “Para ser grande, sê inteiro”',source:'https://pt.wikisource.org/wiki/Para_ser_grande,_sê_inteiro'},
 {id:'pessoa-mensagem',text:'Tudo vale a pena se a alma não é pequena.',author:'Fernando Pessoa',work:'Mensagem · “Mar Português”',source:'https://pt.wikiquote.org/wiki/Fernando_Pessoa'},
 {id:'campos-tabacaria',text:'À parte isso, tenho em mim todos os sonhos do mundo.',author:'Álvaro de Campos (Fernando Pessoa)',work:'“Tabacaria”',source:'https://ministeriodeeducacion.gob.do/docs/biblioteca-virtual/Lrqg-pessoa-fernando-poemaspdf.pdf'},
 {id:'camoes-tempos',text:'Mudam-se os tempos, mudam-se as vontades.',author:'Luís de Camões',work:'Sonetos · “Mudam-se os tempos, mudam-se as vontades”',source:'https://www.up.pt/casacomum/na-poesia-cabem-todas-as-cores/122-mudam-se-os-tempos-mudam-se-as-vontades-luis-de-camoes/'},
 {id:'machado-amar',text:'Cada qual sabe amar a seu modo; o modo, pouco importa; o essencial é que saiba amar.',author:'Machado de Assis',work:'Ressurreição',source:'https://www.correiobraziliense.com.br/cbradar/frase-de-machado-de-assis-do-dia-cada-qual-sabe-amar-a-seu-modo-e-a-reflexao-sobre-como-sentimentos-verdadeiros-nem-sempre-sao-demonstrados-da-maneira-que-esperamos/'}
];
function showDailyWelcome(){
 const dayIndex=Math.floor(Date.parse(today()+'T00:00:00Z')/86400000),phrase=welcomePhrases[dayIndex%welcomePhrases.length];
 $('.welcome .intro').innerHTML=`<span class="welcome-quote">“${esc(phrase.text)}”</span><a class="welcome-quote-source" href="${esc(phrase.source)}" target="_blank" rel="noopener noreferrer">${esc(phrase.author)} · <cite>${esc(phrase.work)}</cite></a>`;
}
showDailyWelcome();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)showDailyWelcome()});
$('#dateLabel').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Sao_Paulo'});load();

document.addEventListener('dreameditionchange',()=>{if(!state.busy)render()});

$('#goalTarget').addEventListener('invalid',()=>{if(!$('#durationInfo').hidden)$('#durationInfo').open=true});
document.addEventListener('click',event=>{const info=$('#durationInfo');if(info.open&&!info.contains(event.target))info.open=false});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#durationInfo').open){$('#durationInfo').open=false;$('#durationInfo summary').focus();event.preventDefault()}});

document.addEventListener('click',event=>{if(event.target.closest('[data-action="not-started"]'))toast('Ainda não começou');});

const celebrationArtWarmed=new Map();
function warmCelebrationArt(){const asset=window.DreamThemes?.current?.celebrationAsset;if(asset&&!celebrationArtWarmed.has(asset)){const art=new Image();celebrationArtWarmed.set(asset,art);art.src=asset;art.decode().catch(()=>celebrationArtWarmed.delete(asset))}}
document.addEventListener('dreameditionchange',warmCelebrationArt);warmCelebrationArt();


const reviewDeferred=new Set();
let incompleteReviewId=null;
function checkIncompleteNotice(){
 if(state.busy||document.hidden||document.querySelector('dialog[open]'))return;
 const goal=state.goals.find(g=>needsIncompleteReview(g)&&!planOf(g).incompleteAccepted&&!reviewDeferred.has(g.id));
 if(!goal)return;
 incompleteReviewId=goal.id;
 const p=planOf(goal),suggestion=p.kind==='habit'?'Uma meta de dias acumulados, sem prazo, pode dar mais espaço para continuar. Você também pode ajustar a rotina ou escolher outro período.':p.kind==='amount'?'Você pode ampliar o prazo ou ajustar o valor da meta para continuar de onde parou.':'Você pode ampliar o prazo, revisar as etapas ou corrigir os registros do que já concluiu.';
 $('#incompleteReviewContent').innerHTML=`<h3 data-user-content>${esc(goal.title)}</h3><p>o prazo terminou em ${prettyDay(p.end)} e a meta não foi atingida.</p><p class="incomplete-review-progress" data-user-content>${esc(progressText(goal))}</p><p>${esc(suggestion)}</p><p class="form-hint">seus registros serão preservados. se já fez mais do que está registrado, você também pode corrigir o histórico antes de decidir.</p><button class="text-button" type="button" data-incomplete-history="${goal.id}">conferir meu histórico</button>`;
 $('#incompleteReviewError').textContent='';
 showDialog($('#incompleteReviewDialog'));
}
function deferIncompleteReview(){if(incompleteReviewId)reviewDeferred.add(incompleteReviewId);$('#incompleteReviewDialog').close()}
$('#deferIncomplete').addEventListener('click',deferIncompleteReview);
$('#incompleteReviewDialog').addEventListener('cancel',()=>{if(incompleteReviewId)reviewDeferred.add(incompleteReviewId)});
function retryIncompleteGoal(id){
 const g=state.goals.find(g=>g.id===id);if(!g)return;
 reviewDeferred.add(id);$('#incompleteReviewDialog').close();$('#incompleteDialog').close();$('#settingsDialog').close();
 openForm(id);$('#goalForm').dataset.reopen='true';
 if(planOf(g).kind==='habit'){$('#goalCompletionMode').value='total';syncDuration()}
 $('#formError').textContent='ajuste a meta, a rotina ou o prazo. seus registros continuam preservados.';
 $('#goalDialog').scrollTop=0;
}
$('#retryIncomplete').addEventListener('click',()=>retryIncompleteGoal(incompleteReviewId));
$('#acceptIncomplete').addEventListener('click',async()=>{
 if(state.busy)return;
 const g=state.goals.find(g=>g.id===incompleteReviewId);if(!g)return;
 state.busy=true;$('#acceptIncomplete').disabled=true;$('#retryIncomplete').disabled=true;
 try{
  if(state.demo)g.plan={...planOf(g),incompleteAccepted:true};
  else Object.assign(g,await api('/'+g.id+'/incomplete','POST',{}));
  $('#incompleteReviewDialog').close();render();toast('seu sonho e sua história ficaram guardados nos tiny dreams incompletos.');
 }catch(error){$('#incompleteReviewError').textContent=error.message}
 finally{state.busy=false;$('#acceptIncomplete').disabled=false;$('#retryIncomplete').disabled=false;checkIncompleteNotice()}
});
function renderIncompleteCollection(){
 const goals=state.goals.filter(isArchivedIncomplete),pending=state.goals.filter(g=>needsIncompleteReview(g)&&!planOf(g).incompleteAccepted);
 const waiting=pending.length?`<p class="form-hint">${pending.length} ${pending.length===1?'tiny dream aguarda':'tiny dreams aguardam'} sua decisão sobre o prazo encerrado.</p><button class="secondary" type="button" data-review-incomplete>revisar prazos encerrados</button>`:'';
 $('#incompleteCollection').innerHTML=waiting+(goals.length?goals.map(g=>`<section class="incomplete-record"><div class="dream-overview"><div class="goal-grid">${goalCard(g)}</div></div><button type="button" class="secondary wide" data-incomplete-retry="${g.id}">ajustar e tentar de novo</button></section>`).join(''):'<p class="muted">nenhum tiny dream guardado como incompleto.</p>');
 fitAmountTrends();
}
$('#openIncompleteButton').addEventListener('click',()=>{$('#settingsDialog').close();renderIncompleteCollection();showDialog($('#incompleteDialog'))});
document.addEventListener('click',event=>{
 if(event.target.closest('[data-review-incomplete]')){reviewDeferred.clear();$('#incompleteDialog').close();checkIncompleteNotice();return}
 const retry=event.target.closest('[data-incomplete-retry]');if(retry)retryIncompleteGoal(retry.dataset.incompleteRetry);
 const history=event.target.closest('[data-incomplete-history]');if(history){deferIncompleteReview();openDetails(history.dataset.incompleteHistory)}
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>setTimeout(checkIncompleteNotice,0)));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkIncompleteNotice()});

// Lock the document as well as its scroll container, including mobile Safari.
let modalScrollY=0,modalLocked=false,modalScrollSnapshot=[];
function restoreModalScroll(){
 for(const {element,left,top} of modalScrollSnapshot)if(element.isConnected)element.scrollTo({left,top,behavior:'instant'});
 window.scrollTo({top:modalScrollY,behavior:'instant'});
}
function showDialog(dialog){
 if(!document.querySelector('dialog[open]')){
  modalScrollY=window.scrollY;
  modalScrollSnapshot=[...document.querySelectorAll('main,.workspace,.mobile-intro-panel,.dream-overview .goal-grid')].map(element=>({element,left:element.scrollLeft,top:element.scrollTop}));
 }
 dialog.showModal();syncModalScroll(modalScrollY);
 // Dialog autofocus may scroll an ancestor before the open observer runs.
 restoreModalScroll();
}
function syncModalScroll(savedScroll){
 const open=!!document.querySelector('dialog[open]');if(open===modalLocked)return;
 modalLocked=open;
 if(open){modalScrollY=typeof savedScroll==='number'?savedScroll:window.scrollY;document.body.style.position='fixed';document.body.style.top=`-${modalScrollY}px`;document.body.style.width='100%';document.documentElement.style.overflow='hidden'}
 else{document.body.style.removeProperty('position');document.body.style.removeProperty('top');document.body.style.removeProperty('width');document.documentElement.style.removeProperty('overflow');restoreModalScroll();requestAnimationFrame(()=>{if(!modalLocked)restoreModalScroll()})}
}
new MutationObserver(syncModalScroll).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});

// Dismiss only when the pointer starts and finishes on the dialog backdrop.
// Dragging a selection or scrollbar out of a form keeps that form open.
document.querySelectorAll('dialog:not(#milestoneDialog)').forEach(dialog=>{
 let startedOutside=false;
 const outside=event=>{const rect=dialog.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom};
 dialog.addEventListener('pointerdown',event=>{startedOutside=event.button===0&&event.target===dialog&&outside(event)});
 dialog.addEventListener('pointercancel',()=>{startedOutside=false});
 dialog.addEventListener('click',event=>{
  const dismiss=startedOutside&&event.target===dialog&&outside(event);startedOutside=false;
  if(!dismiss)return;
  if(dialog.id==='incompleteReviewDialog')deferIncompleteReview();else dialog.close();
 });
});

let analyticsGoal='all';
function renderAnalytics(){
 const asOf=today();
 if(analyticsGoal!=='all'&&!state.goals.some(g=>g.id===analyticsGoal))analyticsGoal='all';
 const goals=analyticsGoal==='all'?state.goals:state.goals.filter(g=>g.id===analyticsGoal);
 const timeline=analyzeTimeline(goals,asOf),data=analyzeHabits(goals,asOf,{since:timeline.days[0],includeToday:true});
 const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
 const date=day=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 const labels={success:'concluído',failure:'falha explícita / recaída',partial:'incompleto',missing:'sem registro',pending:'hoje em aberto',rest:'sem previsão',activity:'registro de quantia, lista ou impulso'};
 const legend=(keys=['success','failure','partial','missing','activity'])=>`<div class="analysis-legend">${keys.map(key=>`<span><i class="analysis-cell is-${key}" aria-hidden="true"></i>${({success:'feito',failure:'falha',partial:'parcial',missing:'sem registro',activity:'outros'})[key]}</span>`).join('')}</div>`;
 const statusLabel=c=>c.day===asOf&&c.status==='partial'?'em andamento hoje':labels[c.status];
 const stats=row=>row.impulse?`${row.cells.filter(c=>c.status==='failure').length} recaídas registradas`:row.kind==='habit'?`${row.counts.success} concluídos · ${row.counts.failure} falhas · ${row.counts.partial} incompletos · ${row.counts.missing} sem registro`:row.kind==='amount'?`${number(row.cells.reduce((n,c)=>n+c.value,0))} ${row.unit} registrados`:`${row.cells.reduce((n,c)=>n+c.value,0)} itens concluídos`;
 const history=`<section class="analysis-section analysis-history"><h3>últimos 28 dias</h3>${legend()}<div class="analysis-date-axis">${[0,7,14,21].map(i=>`<span>${date(timeline.days[i])}</span>`).join('')}</div><div class="analysis-map">${timeline.rows.map(row=>`<div class="analysis-map-row"><div class="analysis-map-label"><strong data-user-content>${esc(row.title)}</strong></div><div class="analysis-cells" role="img" aria-label="${esc(row.title)}: ${esc(stats(row))}">${row.cells.map(c=>`<span class="analysis-cell is-${c.status}${c.day===asOf?' is-today':''}" title="${date(c.day)} · ${statusLabel(c)}${c.value?' · '+number(c.value)+(row.kind==='amount'?' '+esc(row.unit):' itens / registros'):''}" aria-hidden="true"></span>`).join('')}</div></div>`).join('')}</div><details class="analysis-records"><summary>ver datas</summary>${timeline.rows.map(row=>`<div class="analysis-record-group"><h4 data-user-content>${esc(row.title)}</h4><p>${esc(stats(row))}</p><ul>${row.cells.filter(c=>c.status!=='rest').map(c=>`<li>${date(c.day)}: ${statusLabel(c)}${c.value?' · '+number(c.value)+(row.kind==='amount'?' '+esc(row.unit):' itens / registros'):''}</li>`).join('')||'<li>Nenhum registro neste período.</li>'}</ul></div>`).join('')}</details></section>`;
 const max=Math.max(1,...timeline.activity.map(a=>a.total));
 const activity=`<section class="analysis-section analysis-activity"><h3>esta semana</h3><p class="analysis-caption">Tydreams com registro por dia · hoje em andamento</p>${legend(['success','failure','partial','activity'])}<div class="analysis-week" role="list">${timeline.activity.map(a=>`<div class="analysis-day" role="listitem" aria-label="${date(a.day)}: ${a.success} concluídos, ${a.failure} falhas ou recaídas, ${a.partial} parciais, ${a.activity} outros registros"><strong>${a.total}</strong><div class="analysis-day-track" aria-hidden="true">${['activity','partial','failure','success'].map(key=>`<span class="is-${key}" style="height:${a[key]/max*100}%"></span>`).join('')}</div><span>${date(a.day)}</span>${a.day===asOf?'<small>hoje</small>':'<small>&nbsp;</small>'}</div>`).join('')}</div><details class="analysis-records"><summary>ver números</summary><ul>${timeline.activity.map(a=>`<li>${date(a.day)}: ${a.success} concluídos · ${a.failure} falhas / recaídas · ${a.partial} parciais · ${a.activity} outros registros = ${a.total} tydreams</li>`).join('')}</ul></details></section>`;
 const chart=(title,question,rows)=>`<section class="analysis-section"><h3>${title}</h3><p class="muted">${question}</p><div class="analysis-chart" role="list" aria-label="${title}: resultados registrados">${rows.map(r=>`<div class="analysis-row" role="listitem"><div class="analysis-label"><span>${r.label}</span><strong>${r.rate===null?'sem resultado explícito':number(r.rate)+'% de falhas'}</strong></div><div class="analysis-track" aria-hidden="true"><span style="width:${r.rate??0}%"></span></div><small>${r.success} sucessos · ${r.failure} falhas / ${r.total} resultados · ${r.goals} tydreams${r.partial?` · ${r.partial} incompletos`:''}${r.missing?` · ${r.missing} sem registro`:''}</small></div>`).join('')}</div></section>`;
 $('#content').innerHTML=`<section class="analytics-view" aria-labelledby="analyticsTitle"><h2 id="analyticsTitle">análises</h2><div class="analysis-toolbar"><label for="analyticsGoal">Analisar</label><select id="analyticsGoal"><option value="all">Todos os tydreams</option>${state.goals.map(g=>`<option value="${esc(g.id)}" ${g.id===analyticsGoal?'selected':''}>${esc(g.title)}</option>`).join('')}</select><p>${date(timeline.days[0])}–${date(asOf)}</p></div>${state.goals.length?`${activity}${history}${data.habits?`<details class="analysis-comparisons"><summary>comparar hábitos</summary><p class="analysis-method">Neste mesmo período, falhas ÷ (sucessos + falhas explícitas). Incompletos e dias sem registro ficam separados, fora dessa taxa. Hoje entra somente com resultados já registrados. Impulsos usam outra medida e ficam fora desta comparação.</p><div class="analysis-columns">${chart('tamanho da meta','A meta atual é de quantos dias de prática?',data.duration)}${chart('frequência da rotina','Como os resultados se distribuem pela frequência planejada?',data.frequency)}${chart('ao longo do sonho','Apenas hábitos com início e término definidos. Terços do prazo em dias corridos.',data.phase)}${chart('dias da semana','Qual é a distribuição dos resultados em cada dia?',data.weekdays)}</div></details>`:''}<details class="analysis-notes"><summary>sobre os dados</summary><p>No mapa: preenchido = feito, cruz = falha, meio preenchido = parcial, tracejado = sem registro, círculo = outro registro. Casas discretas ficam fora da rotina; o contorno duplo marca hoje. O mapa inclui todos os tipos. Para hábitos, a contagem até ontem separa concluídos, falhas explícitas, incompletos com algum registro e dias previstos sem registro. Hoje pode ter resultado registrado ou ficar em aberto. O cronômetro sozinho não cria registros diários.</p><p>Quantias são somadas na unidade de cada sonho; listas únicas contam os itens registrados. Esses valores não são somados entre unidades diferentes. As colunas contam pares sonho/data, sem comparar quantidades, itens e horas.</p><p>Os resultados salvos são preservados mesmo após mudanças na rotina. A previsão de dias sem registro e as faixas de comparação usam a configuração atual. Nenhum gráfico supõe causalidade nem transforma ausência de marcação em falha.</p></details>`:'<p class="analysis-empty">Crie um tydream para começar seu histórico. Os gráficos aparecem com os seus registros.</p>'}<button class="secondary" data-action="analytics-create">criar um tydream</button></section>`;
}
document.addEventListener('change',event=>{if(event.target.id==='analyticsGoal'){analyticsGoal=event.target.value;renderAnalytics();$('#analyticsGoal').focus()}});
document.addEventListener('click',event=>{if(event.target.closest('[data-action="analytics-create"]'))openForm()});
