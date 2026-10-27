'use strict';
const $=s=>document.querySelector(s);
const state={goals:[],groups:[],realGroups:[],view:'dreams',demo:false,real:[],month:new Date().getMonth(),year:new Date().getFullYear(),calendarGoal:'all',busy:false};
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
async function api(path='',method='GET',body){const r=await fetch('/api/goals'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let data;try{data=await r.json()}catch{throw Error('Não foi possível carregar seus sonhos. Tente novamente.')}if(!r.ok)throw Error(data.error||'Não foi possível salvar. Tente novamente.');return data}
async function load(){resetMilestonePanel();state.busy=true;$('#loading').hidden=false;$('#errorPanel').hidden=true;$('#content').innerHTML='';try{const [goals,groups]=await Promise.all([api(),api('/groups')]);state.real=goals;state.goals=goals;state.realGroups=groups;state.groups=groups;state.demo=false;seedMilestones();render()}catch(e){$('#errorText').textContent=e.message;$('#errorPanel').hidden=false}finally{state.busy=false;$('#loading').hidden=true}}
function demoGoals(){return [{id:'demo-read',title:'Ler antes de dormir',reward:'Um livro novo, escolhido sem pressa',target:21,color:'lavender',days:Array.from({length:8},(_,i)=>dayBefore(i+1)),redeemed:0},{id:'demo-move',title:'Movimentar meu corpo',reward:'Uma massagem só para mim',target:15,color:'peach',days:[0,1,2,4,5,7,8,9,10,11].map(dayBefore),redeemed:0},{id:'demo-pause',title:'Um momento só meu',reward:'Um café da manhã bem especial',target:10,color:'sage',days:[1,2,3,4,5,6].map(dayBefore),redeemed:0}]}
function showDemo(){resetMilestonePanel();state.demo=true;state.goals=demoGoals();state.groups=[];seedMilestones();render()}
function render(){
 const gs=state.goals;
 $('#demoBanner').hidden=!state.demo;$('#goalsCount').textContent=gs.length;
 $('#todayDot').hidden=!gs.some(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&!complete(g)&&!g.days.includes(today()));
 document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(state.view==='shelf')renderShelf();else if(state.view==='today')renderToday();else if(state.view==='calendar')renderCalendar();else renderOverview();
}
function renderOverview(){
 const active=state.goals.filter(g=>!complete(g));
 const section=(name,goals,group)=>{
  const members=group?state.goals.filter(g=>g.group_id===group.id):goals,finished=members.filter(complete).length;
  return `<section class="dream-group ${group?'big-dream-volume':''}"><div class="group-heading">${group?`<span class="volume-emblem" aria-hidden="true">${icon('book')}</span>`:''}<div class="volume-title"><h2>${esc(name)}</h2><p>${group?`${members.length} ${members.length===1?'tydream':'tydreams'} · ${finished} ${finished===1?'realizado':'realizados'}`:`${goals.length} ${goals.length===1?'tydream em andamento':'tydreams em andamento'}`}</p></div>${group?`<button class="text-button" data-action="edit-group" data-group="${esc(group.id)}" aria-label="Organizar Big Dream ${esc(name)}">Organizar</button>`:''}</div>${goals.length?`<div class="goal-grid" tabindex="0" role="region" aria-label="Tydreams de ${esc(name)}">${goals.map(goalCard).join('')}</div>`:`<p class="group-empty">${finished?'Os tydreams concluídos deste grupo estão na Prateleira.':'Adicione tydreams pelo botão Organizar ou escolha este Big Dream ao criar um sonho.'}</p>`}</section>`;
 };
 const ungrouped=active.filter(g=>!state.groups.some(group=>group.id===g.group_id));
 $('#content').innerHTML=`<div class="dream-overview"><div class="overview-tools"><h2>Big Dreams</h2><button class="secondary" data-action="new-group">Criar Big Dream</button></div>${!state.goals.length&&!state.groups.length?`<div class="empty"><h2>Seu próximo capítulo começa aqui.</h2><p>Crie seu primeiro tydream ou um Big Dream para reunir seus sonhos.</p><div class="empty-actions"><button class="primary" data-action="new">Criar meu primeiro sonho</button><button class="text-button" data-action="demo">Explorar um exemplo</button></div></div>`:`${state.groups.map(group=>section(group.name,active.filter(g=>g.group_id===group.id),group)).join('')}${ungrouped.length?section(state.groups.length?'Sem Big Dream':'Meus tydreams',ungrouped):''}${!active.length&&state.goals.length&&!state.groups.length?'<p class="muted">Seus tydreams realizados estão na Prateleira.</p>':''}<button class="secondary overview-add" data-action="new">Criar outro tydream</button>`}</div>`;
}
function openGroup(id){
 const group=state.groups.find(g=>g.id===id);
 $('#groupId').value=group?.id||'';$('#groupName').value=group?.name||'';$('#groupFormTitle').textContent=group?'Organizar Big Dream':'Criar um Big Dream';$('#groupError').textContent='';
 $('#groupMembers').innerHTML=state.goals.length?state.goals.map(g=>{const current=state.groups.find(group=>group.id===g.group_id);return `<label class="group-member"><input type="checkbox" value="${esc(g.id)}" ${group&&g.group_id===group.id?'checked':''}><span><strong>${esc(g.title)}</strong><small>${complete(g)?'Realizado · ':''}${current?esc(current.name):'Sem Big Dream'}</small></span></label>`}).join(''):'<p class="muted">Você pode criar o grupo agora e adicionar tydreams depois.</p>';
 $('#deleteGroup').hidden=!group;$('#groupDeleteConfirm').hidden=true;$('#groupDialog').showModal();
}
$('#groupForm').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy)return;
 const id=$('#groupId').value,name=$('#groupName').value.trim(),goalIds=[...document.querySelectorAll('#groupMembers input:checked')].map(input=>input.value);
 if(!name){$('#groupError').textContent='Dê um nome ao Big Dream.';return}
 if(state.groups.some(g=>g.id!==id&&g.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){$('#groupError').textContent='Já existe um Big Dream com esse nome.';return}
 state.busy=true;$('#saveGroup').disabled=true;$('#groupError').textContent='';
 try{
  const group=state.demo?{id:id||'demo-group-'+crypto.randomUUID(),name}:await api('/groups'+(id?'/'+id:''),id?'PATCH':'POST',{name,goalIds});
  if(id)Object.assign(state.groups.find(g=>g.id===id),group);else state.groups.push(group);
  for(const g of state.goals){if(g.group_id===group.id)g.group_id=null;if(goalIds.includes(g.id))g.group_id=group.id}
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
function calendarCompleted(g,day){
 const p=planOf(g);
 if(p.kind==='habit')return g.days.includes(day);
 if(p.kind==='list')return p.items.some(item=>(g.entries||[]).some(entry=>entry.key===item.id&&entry.day===day));
 return complete(g)&&completionDay(g)===day;
}
function renderCalendar(){
 const first=new Date(state.year,state.month,1),days=new Date(state.year,state.month+1,0).getDate(),gs=state.calendarGoal==='all'?state.goals:state.goals.filter(g=>g.id===state.calendarGoal),title=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 let cells='<div class="calendar-day blank"></div>'.repeat(first.getDay());
 for(let n=1;n<=days;n++){
  const day=localDay(new Date(state.year,state.month,n)),selected=gs.length===1&&state.calendarGoal!=='all'?gs[0]:null;
  const completed=gs.filter(g=>calendarCompleted(g,day)),success=completed.length,failure=gs.filter(g=>(g.failures||[]).includes(day)).length,records=gs.filter(g=>(g.entries||[]).some(e=>e.day===day)).length;
  const editable=selected&&planOf(selected).kind==='habit'&&day<=today()&&(scheduled(selected,day)||outcomeOf(selected,day));
  const status=selected?outcomeOf(selected,day):null;
  cells+=`<${editable?'button':'div'} class="calendar-day ${day===today()?'current':''} ${success?'has-check':''} ${failure?'has-failure':''} ${day>today()?'future':''}" ${editable?`data-action="record" data-id="${selected.id}" data-day="${day}"`:''} aria-label="${n} de ${title}, ${status==='success'?'sucesso':status==='failure'?'falha':editable?'sem registro':`${success} sucessos, ${failure} falhas`}${success?esc('. Realizados: '+completed.map(g=>g.title).join(', ')):''}">${n}<div class="calendar-marks" aria-hidden="true">${completed.map(g=>`<span class="calendar-symbol" title="${esc(g.title)}">${goalEmoji(g)}</span>`).join('')}${failure?'<span class="failure-dot"></span>':''}${!success&&!failure&&records?'<span class="partial-dot"></span>':''}</div></${editable?'button':'div'}>`;
 }
 $('#content').innerHTML=`<div class="calendar-panel"><div class="calendar-heading"><h2 style="text-transform:capitalize">${title}</h2><div class="calendar-controls"><button class="icon-button" data-action="prev" aria-label="Mês anterior">‹</button><button class="icon-button" data-action="next" aria-label="Próximo mês">›</button></div></div><label for="calendarGoal">Ver registros de</label><select id="calendarGoal" class="calendar-goal-select"><option value="all">Todos os sonhos</option>${state.goals.map(g=>`<option value="${g.id}" ${state.calendarGoal===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select><div class="weekdays">${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><p class="calendar-legend">Símbolo do tydream: realizado. Quadradinho vazado: falha. Ponto tracejado: registro parcial. Dia sem resultado continua sem registro. ${state.calendarGoal==='all'?'Escolha um hábito para registrar seus dias.':'Toque em um dia para ver ou corrigir seu resultado.'}</p></div>`;
}
function animateProgress(g,previous){celebrateMilestone(g,previous);document.dispatchEvent(new CustomEvent('dreamprogress',{detail:{id:g.id,from:previous/targetOf(g),to:progress(g)/targetOf(g)}}))}
async function changeDay(id,day=today()){if(state.busy)return;const g=state.goals.find(x=>x.id===id);if(!g)return;const previous=progress(g);state.busy=true;document.querySelectorAll(`[data-id="${id}"]`).forEach(b=>b.disabled=true);try{const was=g.days.includes(day);if(state.demo){g.days=was?g.days.filter(d=>d!==day):[...g.days,day];if(!was)g.failures=(g.failures||[]).filter(d=>d!==day);if(g.days.length<g.target)g.redeemed=0}else{const result=await api('/'+id+'/check','POST',{day,done:!was});Object.assign(g,result)}render();toast(was?'Registro desfeito. Seu caminho continua.':complete(g)?'Seu sonho floresceu!':'Mais um pequeno passo. Ele conta.');animateProgress(g,previous)}catch(e){toast(e.message);render()}finally{state.busy=false}}
$('#goalForm').addEventListener('submit',async e=>{e.preventDefault();if(state.busy)return;const id=$('#goalId').value,body={title:$('#goalTitle').value.trim(),reward:$('#goalReward').value.trim(),target:Number($('#goalTarget').value),groupId:$('#goalGroup').value||null,color:state.goals.find(g=>g.id===id)?.color||automaticAmulet(state.goals)};try{body.plan=validatePlan(formPlan());if(body.plan.kind==='habit'&&$('#habitMeasure').value==='tasks'&&!body.plan.tasks.length)throw Error('Adicione pelo menos uma tarefa para esta rotina.');body.target=targetOf({...body});if(!body.title)throw Error('Dê um nome ao seu sonho.')}catch(e){$('#formError').textContent=e.message;return}state.busy=true;$('#saveGoal').disabled=true;try{if(state.demo){if(id)Object.assign(state.goals.find(g=>g.id===id),body,{group_id:body.groupId,redeemed:0});else state.goals.push({...body,group_id:body.groupId,id:'demo-'+crypto.randomUUID(),days:[],entries:[],redeemed:0})}else{const g=await api(id?'/'+id:'',id?'PATCH':'POST',body);if(id)Object.assign(state.goals.find(x=>x.id===id),g);else state.goals.push(g);state.real=state.goals}$('#goalDialog').close();render();const saved=id?state.goals.find(g=>g.id===id):state.goals.at(-1);if(!id&&saved&&pendingPastDays(saved,today()).length){openDetails(saved.id,pendingPastDays(saved,today())[0]);$('#pastHistoryTitle').scrollIntoView({block:'start'})}toast(state.demo?'Exemplo atualizado. Seus dados reais continuam separados.':id?'Seu sonho ganhou novos cuidados.':'O primeiro capítulo está escrito.')}catch(e){$('#formError').textContent=e.message}finally{state.busy=false;$('#saveGoal').disabled=false}});
let deleteId;
document.addEventListener('click',async e=>{const close=e.target.closest('[data-close]');if(close){$('#'+close.dataset.close).close();return}const b=e.target.closest('[data-action]');if(!b)return;const {action,id,day}=b.dataset;if(action==='new')openForm();if(action==='demo')showDemo();if(action==='edit')openForm(id);if(action==='delete'){deleteId=id;$('#confirmDialog').showModal()}if(action==='check'||action==='day')await changeDay(id,day);if(action==='prev'||action==='next'){state.month+=action==='next'?1:-1;const d=new Date(state.year,state.month,1);state.year=d.getFullYear();state.month=d.getMonth();render()}if(action==='redeem'){if(state.busy)return;state.busy=true;b.disabled=true;try{const g=state.goals.find(x=>x.id===id);if(state.demo)g.redeemed=1;else Object.assign(g,await api('/'+id+'/redeem','POST'));render();toast('Você fez por merecer. Aproveite sua recompensa!')}catch(e){toast(e.message);b.disabled=false}finally{state.busy=false}}});
$('#confirmDelete').addEventListener('click',async()=>{if(state.busy)return;state.busy=true;$('#confirmDelete').disabled=true;try{if(!state.demo)await api('/'+deleteId,'DELETE');state.goals=state.goals.filter(g=>g.id!==deleteId);if(!state.demo)state.real=state.goals;if(state.calendarGoal===deleteId)state.calendarGoal='all';$('#confirmDialog').close();render();toast('Espaço aberto para novos caminhos.')}catch(e){toast(e.message)}finally{state.busy=false;$('#confirmDelete').disabled=false}});
$('#content').addEventListener('change',e=>{if(e.target.id==='calendarGoal'){state.calendarGoal=e.target.value;renderCalendar()}});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render()}));$('#newGoalButton').addEventListener('click',()=>openForm());$('#settingsButton').addEventListener('click',()=>$('#settingsDialog').showModal());$('#retryButton').addEventListener('click',load);$('#leaveDemo').addEventListener('click',()=>{resetMilestonePanel();state.demo=false;state.goals=state.real;state.groups=state.realGroups;state.calendarGoal='all';render()});$('#exportButton').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),demo:state.demo,goals:state.goals,groups:state.groups},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tiny-dreams-${today()}${state.demo?'-exemplo':''}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Uma cópia da sua história, guardada.')});
Object.assign(icons,{
 diary:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4m-4 5h4m-4 5h4m6-10h4m-4 4h4"/>',
 ghost:'<path d="M5 20V10a7 7 0 0 1 14 0v10l-3-2-4 2-4-2-3 2Z"/><circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none"/><path d="M10 14q2 2 4 0"/>',
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
const prettyDay=d=>d?dateFrom(d).toLocaleDateString('pt-BR'):'';
function deadline(g){const p=planOf(g);if(complete(g))return 'Sonho concluído';if(p.start&&p.start>today())return `Começa em ${prettyDay(p.start)}`;if(!p.end)return 'Sem prazo definido';const n=daysUntil(p.end,today());return n<0?`Prazo em ${prettyDay(p.end)} · encerrado`:n===1?'Prazo hoje':`Até ${prettyDay(p.end)}`}
function cardCountdown(g){
 if(complete(g))return {value:'✓',label:'Você chegou. Celebre!'};
 const p=planOf(g);
 if(p.kind==='habit'&&p.end){const remaining=daysUntil(p.end,today());if(remaining!==null)return {value:fmt(Math.max(0,remaining)),lead:remaining>0?(remaining===1?'Só falta':'Só faltam'):'',label:remaining<0?'Prazo encerrado':remaining===1?'dia para o seu tydream virar realidade · termina hoje':'dias para o seu tydream virar realidade'}}
 return {value:fmt(Math.max(0,targetOf(g)-progress(g))),label:p.kind==='habit'?'dias de prática restantes':`${unit(g)} para seu sonho`};
}
function unit(g){const p=planOf(g);return p.kind==='habit'?'dias':p.kind==='list'?'etapas':p.unit||'unidades'}
function routineLabel(g){const p=planOf(g);return p.kind==='habit'?(p.weekdays.length===7?'Todos os dias':p.weekdays.map(d=>weekNames[d]).join(', ')):p.kind==='list'?'Livros, consultas e etapas':'Meta de valor'}
function frontDailyActions(g){
 if(planOf(g).kind!=='habit')return '';
 const p=planOf(g),status=outcomeOf(g,today()),allowed=scheduled(g,today()),measured=p.tasks.length||p.dailyTarget,notStarted=!!p.start&&p.start>today();
 const successAction=notStarted?'data-action="not-started"':measured?'data-action="details"':'data-action="quick-outcome" data-status="success"';
 const successLabel=measured?(p.dailyList?'Marcar itens de hoje':p.dailyTarget?'Registrar quantidade':'Ver tarefas'):status==='success'?(p.impulse?'Resisti · desfazer':'Feito · desfazer'):(p.impulse?'Resisti hoje':'Fiz hoje');
 const failureLabel=status==='failure'?(p.impulse?'Cedi · desfazer':'Falha · desfazer'):(p.impulse?'Cedi ao impulso':'Falha hoje');
 return `<div class="quick-outcomes" role="group" aria-label="Resultado de hoje: ${esc(g.title)}"><button class="check-button ${notStarted?'not-started':''} ${status==='success'?'done':''}" ${successAction} data-id="${g.id}" ${measured?'':`aria-pressed="${status==='success'}"`} ${notStarted?'aria-disabled="true" title="Ainda não começou"':!allowed&&(measured||status!=='success')?'disabled':''}>${icon('check')}<span>${successLabel}</span></button><button class="check-button failure-button ${notStarted?'not-started':''} ${status==='failure'?'failed':''}" data-action="${notStarted?'not-started':'quick-outcome'}" data-status="failure" data-id="${g.id}" aria-pressed="${status==='failure'}" ${notStarted?'aria-disabled="true" title="Ainda não começou"':!allowed&&status!=='failure'||measured&&status==='success'?'disabled':''}>${icon('cross')}<span>${failureLabel}</span></button></div>`;
}
function progressToken(){return `<i class="progress-token" aria-hidden="true">${icon(window.DreamThemes?.current?.progressSymbol||'star')}</i>`}
function goalCard(g){const count=progress(g),target=targetOf(g),earned=complete(g),p=planOf(g),done=dayDone(g,today()),hasPast=!!p.start&&p.start<today(),amulet=window.DreamThemes?.current,countdown=cardCountdown(g);return `<article class="goal ${esc(g.color)}" data-goal="${g.id}" data-amulet-edition="${esc(amulet?.id||'2026-10')}" style="${amulet?.asset?`--amulet-objects:url('${esc(amulet.asset)}');--amulet-aspect:${amulet.geometry.objectAspect};--amulet-sheet-height:${amulet.geometry.objectSheetHeight}%`: ""}"><div class="goal-top"><span class="goal-symbol">${goalEmoji(g)}</span><div class="goal-menu">${p.impulse?`<button class="small-button diary-button" data-action="details" data-id="${g.id}" aria-label="${hasPast?'Impulsos e histórico':'Diário de impulsos'} de ${esc(g.title)}" title="Abrir diário de impulsos">${icon('diary')}</button>`:''}<button class="small-button" data-action="edit" data-id="${g.id}" aria-label="Editar ${esc(g.title)}">${icon('edit')}</button><button class="small-button" data-action="delete" data-id="${g.id}" aria-label="Apagar ${esc(g.title)}">${icon('trash')}</button></div></div><div class="dream-summary"><div class="talisman" aria-hidden="true" style="--charge:${Math.min(1,count/target)}">${g.color==='sage'&&(!amulet||amulet.id==='2026-10')?'<span class="ghost-scene"><span class="ghost-jar"></span><span class="ghost-viewport"><span class="ghost-spirit"></span></span><span class="ghost-foreground"></span></span>':''}</div><h2>${esc(g.title)}</h2><p class="goal-meta">${esc(routineLabel(g))}${p.kind==='habit'?` · ${streak(g)} dias seguidos`:''}</p><p class="deadline ${p.end&&p.end<today()&&!earned?'overdue':''}">${deadline(g)}</p><div class="countdown">${countdown.lead?`<small class="countdown-lead">${esc(countdown.lead)}</small>`:''}<strong>${esc(countdown.value)}</strong><span>${esc(countdown.label)}</span></div></div><div class="progress" role="progressbar" aria-label="Progresso de ${esc(g.title)}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(count,target)}"><span style="width:${Math.min(100,count/target*100)}%">${progressToken()}</span></div><div class="progress-label"><span>${fmt(count)} de ${fmt(target)} ${p.kind==='habit'&&p.start&&p.end?'dias do período':esc(unit(g))}</span><span>${Math.min(100,Math.round(count/target*100))}%</span></div>${g.reward?`<div class="reward">${icon('gift')}<div><div class="reward-label">${g.redeemed?'Recompensa celebrada':earned?'Recompensa liberada':'Esperando por você'}</div><div class="reward-name">${esc(g.reward)}</div></div></div>`:''}${earned&&g.reward?`<button class="check-button earned" data-action="redeem" data-id="${g.id}" ${g.redeemed?'disabled':''}>${icon('gift')}${g.redeemed?'Já celebrei esse sonho':'Resgatar minha recompensa'}</button>`:''}${frontDailyActions(g)}${p.impulse?`<p class="daily-summary">Hoje: ${outcomeLabel(g,today())}</p>`:''}${pendingPastDays(g,today()).length?`<button class="text-button history-open" data-action="history" data-id="${g.id}">Preencher ${pendingPastDays(g,today()).length} dias anteriores</button>`:''}${p.dailyTarget?`<p class="daily-summary">Hoje: ${fmt(dailyTotal(g,today()))} de ${fmt(p.dailyTarget)} ${esc(p.unit)}${done?' · Feito':''}</p>`:''}${!p.impulse&&(hasPast||p.dailyTarget||p.tasks.length||p.kind!=='habit')?`<button class="text-button plan-open" data-action="details" data-id="${g.id}">${p.impulse?(hasPast?'Impulsos e histórico':'Registrar impulsos'):p.dailyTarget?(hasPast?'Registrar quantidade e ver histórico':'Registrar quantidade'):p.kind==='amount'?(hasPast?'Registrar valor e ver histórico':'Registrar valor'):p.kind==='list'?'Abrir minha lista':p.dailyList?'Abrir lista diária':hasPast?'Ver histórico':'Ver tarefas'}</button>`:''}</article>`}
function renderToday(){const habits=state.goals.filter(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&(!complete(g)||dayDone(g,today()))),items=state.goals.flatMap(g=>planOf(g).kind==='list'?planOf(g).items.filter(i=>i.date&&i.date<=today()&&!(g.entries||[]).some(e=>e.key===i.id)).map(i=>({g,i})):[]);$('#content').innerHTML=`<div class="today-heading"><h2>Um carinho por você, hoje.</h2><p>${habits.filter(g=>dayDone(g,today())).length} de ${habits.length} hábitos feitos${items.length?` · ${items.length} etapas até hoje`:''}</p></div>${habits.map(g=>`<div class="today-row"><span class="goal-symbol">${goalEmoji(g)}</span><div class="today-info"><h3>${esc(g.title)}</h3><p>${planOf(g).impulse?outcomeLabel(g,today()):planOf(g).dailyTarget?`${fmt(dailyTotal(g,today()))} de ${fmt(planOf(g).dailyTarget)} ${esc(planOf(g).unit)} hoje`:tasksOn(g,today()).map(t=>esc(t.title)).join(' · ')||`${progress(g)} de ${targetOf(g)} dias`}</p></div>${frontDailyActions(g)}</div>`).join('')}${items.map(({g,i})=>`<div class="today-row"><div class="today-info"><h3>${esc(i.title)}</h3><p>${esc(g.title)} · ${prettyDay(i.date)}</p></div><button class="secondary" data-action="details" data-id="${g.id}">Ver etapa</button></div>`).join('')}${!habits.length&&!items.length?'<p class="muted">Nada pendente para hoje. Seus sonhos e prazos continuam na visão geral.</p>':''}`}
function dayOptions(selected=[0,1,2,3,4,5,6]){return weekNames.map((d,i)=>`<label><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}
function updateTaskSummaries(){
 const rows=[...document.querySelectorAll('.routine-row')];
 rows.forEach((el,index)=>{
  el.querySelector('.task-summary-title').textContent=el.querySelector('.row-title').value.trim()||`Nova tarefa ${index+1}`;
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
 $('#routineSummary').textContent=`${schedule} · ${mode==='tasks'?'concluir as tarefas previstas':mode==='quantity'?'atingir a quantidade diária':mode==='impulse'?'registrar como lidei com o impulso':'marcar como feito'}`;
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
 const target=$('#goalTarget'),hint=$('#durationHint');target.setCustomValidity('');target.readOnly=false;hint.hidden=formKind()!=='habit';$('#durationInfo').hidden=hint.hidden;if(hint.hidden){$('#durationInfo').open=false;return}
 const start=$('#goalStart').value,end=$('#goalEnd').value;$('#targetLabel').textContent=start&&end?'Dias de prática no período':'Quantos dias de prática?';const weekdays=[...$('#goalWeekdays').querySelectorAll('input:checked')].map(input=>Number(input.value));
 if(!start||!end){hint.textContent='Com início e término, calculo os dias da sua rotina. Sem período completo, defina a meta em dias.';return}
 const count=practiceDays(start,end,weekdays);
 if(count===null){hint.textContent='O término precisa ser na data de início ou depois dela.';target.setCustomValidity(hint.textContent);return}
 target.readOnly=true;target.value=count;
 hint.textContent=count?`Pelo período: ${count} ${count===1?'dia de prática':'dias de prática'}, incluindo início e término. A meta acompanha as datas e os dias da rotina.`:'Nenhum dia da rotina neste período. Ajuste as datas ou os dias da semana.';
 if(!count)target.setCustomValidity(hint.textContent);
 if(count>3650){hint.textContent='Este período passa de 3650 dias de prática. Escolha um período menor.';target.setCustomValidity(hint.textContent)}
}
function syncKind(){const daily=isDailyList(),kind=formKind();if(daily)$('#habitMeasure').value='tasks';$('#habitMeasureField').hidden=daily;$('#repeatList').disabled=$('#goalKind').disabled;$('#habitSetupTitle').textContent=daily?'Dias da sua lista':'Sua rotina';$('#taskFields h4').textContent=daily?'Itens para cumprir em cada dia':'Tarefas do hábito';$('#addRoutine').textContent=daily?'Adicionar item':'Adicionar tarefa';const quantity=kind==='habit'&&$('#habitMeasure').value==='quantity';$('#impulseFields').hidden=kind!=='habit'||$('#habitMeasure').value!=='impulse';$('#dailyQuantityFields').hidden=!quantity;$('#taskFields').hidden=kind!=='habit'||$('#habitMeasure').value!=='tasks';$('#completionHint').textContent=daily?'Os itens ficam disponíveis em cada dia da rotina. Cumprir todos conta um dia de prática; o tydream só termina ao atingir a meta de dias.':$('#habitMeasure').value==='impulse'?'Marque quando resistiu a uma vontade. O resultado do dia é registrado separadamente.':quantity?'Some seus registros ao longo do dia. A meta diária conclui o hábito.':$('#habitMeasure').value==='tasks'?'Cada tarefa pode ter seus próprios dias. Só aparecem as tarefas previstas para a data.':'Um toque para registrar seu dia, sem tarefas ou quantidades.';$('#goalDailyTarget').required=quantity;$('#goalDailyUnit').required=quantity;$('#goalDailyTarget').disabled=!quantity;$('#goalDailyUnit').disabled=!quantity;$('#habitFields').hidden=kind!=='habit';$('#listFields').hidden=kind!=='list';$('#targetField').hidden=kind==='list';$('#unitField').hidden=kind!=='amount';$('#goalTarget').required=kind!=='list';$('#goalTarget').max=kind==='habit'?3650:1000000000;$('#goalTarget').step=kind==='amount'?'0.01':'1';$('#targetLabel').textContent=kind==='habit'?'Quantos dias de prática?':'Qual valor quer alcançar?';document.querySelectorAll('#routineRows input').forEach(e=>e.disabled=kind!=='habit'||$('#habitMeasure').value!=='tasks');document.querySelectorAll('#itemRows input').forEach(e=>e.disabled=kind!=='list');updateTaskSummaries();syncDuration()}
function openForm(id){$('#durationInfo').open=false;const g=state.goals.find(x=>x.id===id),p=g?planOf(g):planOf({});$('#goalGroup').innerHTML='<option value="">Sem Big Dream</option>'+state.groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');$('#goalGroup').value=g?.group_id||'';$('#goalId').value=g?.id||'';$('#goalTitle').value=g?.title||'';$('#goalReward').value=g?.reward||'';$('#goalTarget').value=g?targetOf(g):'';$('#goalEmoji').value=p.emoji||({sage:'🌿',peach:'⭐',lavender:'📖'}[g?.color]||'📖');updateEmojiPicker();$('#goalKind').value=p.dailyList?'daily-list':p.kind;$('#goalKind').disabled=!!g&&(g.days.length>0||(g.entries||[]).length>0||(g.failures||[]).length>0);$('#goalStart').value=p.start||'';$('#goalEnd').value=p.end||'';$('#goalNotes').value=p.notes;$('#goalUnit').value=p.unit;$('#habitMeasure').value=p.impulse?'impulse':p.dailyTarget?'quantity':p.tasks.length?'tasks':'check';$('#goalSupport').value=p.support||'';$('#habitMeasure').disabled=!!g&&!!(p.dailyTarget||p.tasks.length)&&(g.days.length>0||(g.entries||[]).length>0);$('#goalDailyTarget').value=p.dailyTarget||'';$('#goalDailyUnit').value=p.dailyTarget?p.unit:'';$('#goalDailyUnit').readOnly=!!p.dailyTarget&&!!g?.entries?.length;$('#goalWeekdays').innerHTML=dayOptions(p.weekdays);$('#routineRows').innerHTML='';$('#itemRows').innerHTML='';p.tasks.forEach(addRoutineRow);p.items.forEach(addItemRow);$('#formTitle').textContent=g?'Cuidar deste sonho.':'Era uma vez um pequeno sonho.';$('#saveGoal').textContent=g?'Salvar mudanças':'Começar meu capítulo';$('#formError').textContent='';syncKind();$('#goalDialog').showModal()}
function formPlan(){return {impulse:formKind()==='habit'&&$('#habitMeasure').value==='impulse',support:$('#goalSupport').value.trim(),emoji:$('#goalEmoji').value.trim(),kind:formKind(),dailyList:isDailyList(),start:$('#goalStart').value,end:$('#goalEnd').value,notes:$('#goalNotes').value.trim(),unit:formKind()==='habit'&&$('#habitMeasure').value==='quantity'?$('#goalDailyUnit').value.trim():$('#goalUnit').value.trim(),dailyTarget:formKind()==='habit'&&$('#habitMeasure').value==='quantity'?Number($('#goalDailyTarget').value):null,weekdays:[...$('#goalWeekdays').querySelectorAll('input:checked')].map(e=>Number(e.value)),tasks:formKind()==='habit'&&$('#habitMeasure').value==='tasks'?[...document.querySelectorAll('.routine-row')].map(el=>({id:el.dataset.key,title:el.querySelector('.row-title').value.trim(),weekdays:[...el.querySelectorAll('input:checked')].map(e=>Number(e.value))})):[],items:$('#goalKind').value==='list'?[...document.querySelectorAll('.item-row')].map(el=>({id:el.dataset.key,title:el.querySelector('.row-title').value.trim(),date:el.querySelector('.row-date').value})):[]}}
let historyFilter='pending',historyPage=0;
function outcomeLabel(g,day){const status=outcomeOf(g,day);return status==='success'?(planOf(g).impulse?'Consegui resistir':'Sucesso'):status==='failure'?(planOf(g).impulse?'Cedi ao impulso':'Falha registrada'):'Sem registro'}
function dayOutcomeControls(g,day,canSucceed=true){
 const status=outcomeOf(g,day),allowed=day<=today()&&scheduled(g,day),impulse=planOf(g).impulse;
 return `<div class="day-outcome"><p class="outcome-status ${status||'unknown'}">${outcomeLabel(g,day)}</p><div class="outcome-actions">${canSucceed?`<button class="secondary" type="button" data-outcome="success" data-outcome-day="${day}" aria-pressed="${status==='success'}" ${!allowed?'disabled':''}>${impulse?'Consegui resistir':'Sucesso'}</button>`:''}${!canSucceed&&status==='success'?'':`<button class="secondary" type="button" data-outcome="failure" data-outcome-day="${day}" aria-pressed="${status==='failure'}" ${!allowed?'disabled':''}>${impulse?'Cedi ao impulso':'Não consegui'}</button>`}</div>${status?`<button class="text-button clear-outcome" type="button" data-outcome="clear" data-outcome-day="${day}">${canSucceed?'Deixar sem registro':'Limpar os registros deste dia'}</button>`:''}<p class="form-hint">${impulse?'Um dia difícil não apaga os sucessos dos outros dias.':'Dias sem resposta continuam sem registro, sem contar como falha.'}</p></div>`;
}
function habitDetails(g){
 const pending=pendingPastDays(g,today()),success=g.days.length,failures=(g.failures||[]).length;
 return `<div class="outcome-totals"><span>${success} ${success===1?'sucesso':'sucessos'}</span><span>${failures} ${failures===1?'falha':'falhas'}</span><span>${pending.length} dias anteriores sem registro</span></div><label for="routineDay">Qual dia você quer registrar?</label><input id="routineDay" type="date" value="${today()}" max="${today()}"><div id="routineChecks"></div><section class="past-history" aria-labelledby="pastHistoryTitle"><h3 id="pastHistoryTitle">Dias anteriores</h3><p class="form-hint">Preencha o que aconteceu desde o início do sonho. Você pode corrigir qualquer resultado.</p><label for="historyFilter">Mostrar</label><select id="historyFilter"><option value="pending" ${historyFilter==='pending'?'selected':''}>Sem registro</option><option value="all" ${historyFilter==='all'?'selected':''}>Todos os dias</option></select><div id="pastHistory"></div></section>`;
}
function renderPastHistory(){
 const g=state.goals.find(g=>g.id===detailId);if(!g||!$('#pastHistory'))return;
 const days=historyFilter==='pending'?pendingPastDays(g,today()):pastPracticeDays(g,today()),pageSize=14,pages=Math.max(1,Math.ceil(days.length/pageSize));historyPage=Math.min(historyPage,pages-1);
 const p=planOf(g),requiresDetails=p.dailyTarget||p.tasks.length;
 $('#pastHistory').innerHTML=days.length?`${days.slice(historyPage*pageSize,(historyPage+1)*pageSize).map(day=>{const status=outcomeOf(g,day);return `<div class="past-day"><div><strong>${prettyDay(day)}</strong><small class="${status||'unknown'}">${outcomeLabel(g,day)}</small></div><div class="past-day-actions"><button type="button" class="secondary" data-past-day="${day}" ${requiresDetails?'data-open-day':'data-past-status="success"'} aria-label="${requiresDetails?'Registrar':'Sucesso em'} ${prettyDay(day)}" ${status==='success'?'disabled':''}>${requiresDetails?'Registrar':p.impulse?'Resisti':'Sucesso'}</button><button type="button" class="secondary" data-past-day="${day}" data-past-status="failure" aria-label="Falha em ${prettyDay(day)}" ${status==='failure'||requiresDetails&&status==='success'?'disabled':''}>${p.impulse?'Cedi':'Falha'}</button><button type="button" class="text-button" data-select-day="${day}" aria-label="Ver ou corrigir ${prettyDay(day)}">Ver</button></div></div>`}).join('')}<div class="history-pagination"><button type="button" class="text-button" data-history-page="-1" ${!historyPage?'disabled':''}>Anteriores</button><span>${historyPage+1} de ${pages}</span><button type="button" class="text-button" data-history-page="1" ${historyPage>=pages-1?'disabled':''}>Próximos</button></div>`:!p.start?'<p class="muted">Defina a data de início para organizar os dias anteriores. Você também pode escolher uma data acima.</p>':`<p class="muted">${historyFilter==='pending'?'Nenhum dia anterior pendente.':'Ainda não há dias anteriores nesta rotina.'}</p>`;
}
function renderImpulse(g,day){
 const p=planOf(g),allowed=day<=today()&&scheduled(g,day),urges=(g.entries||[]).filter(e=>e.day===day&&e.key.startsWith('urge:'));
 $('#routineChecks').innerHTML=`${p.support?`<div class="impulse-support"><h3>Meu combinado</h3><p>${esc(p.support)}</p></div>`:''}<div class="impulse-moment"><h3>Uma vontade de cada vez</h3><p class="form-hint">Registre quando conseguiu atravessar uma vontade sem ceder. Isso não conclui o dia automaticamente.</p><form id="urgeForm"><label for="urgeNote">O que ajudou? (opcional)</label><input id="urgeNote" maxlength="300"><button type="submit" class="primary wide" ${!allowed?'disabled':''}>Resisti a um impulso</button></form><p class="muted">${urges.length} ${urges.length===1?'vontade superada':'vontades superadas'} neste dia</p>${urges.map(e=>`<div class="plan-item"><span>${e.note?esc(e.note):'Resisti a uma vontade'}</span><button type="button" class="text-button" data-entry-key="${e.key}" data-entry-day="${day}">Remover</button></div>`).join('')}</div><h3>Como foi o dia?</h3>${dayOutcomeControls(g,day)}`;
}
function applyDemoOutcome(g,day,status){
 g.days=g.days.filter(d=>d!==day);g.failures=(g.failures||[]).filter(d=>d!==day);
 if(status==='success')g.days.push(day);if(status==='failure')g.failures.push(day);
 if(!status&&(planOf(g).tasks.length||planOf(g).dailyTarget))g.entries=(g.entries||[]).filter(e=>e.day!==day);
 if(!complete(g))g.redeemed=0;
}
async function saveOutcome(id,day,status){
 if(state.busy)return;const g=state.goals.find(g=>g.id===id);if(!g)return;
 const inDetails=$('#progressDialog').open&&detailId===id,previous=progress(g);
 state.busy=true;document.querySelectorAll(`[data-id="${id}"]`).forEach(button=>button.disabled=true);
 if(inDetails)$('#progressContent').querySelectorAll('button').forEach(button=>button.disabled=true);
 try{
  if(state.demo)applyDemoOutcome(g,day,status);else Object.assign(g,await api('/'+id+'/outcome','POST',{day,status}));
  render();if(inDetails)openDetails(id,day);animateProgress(g,previous);
  if(status!=='success'||$('#milestone').hidden)toast(status==='success'?'Seu sucesso ficou registrado.':status==='failure'?'Dia registrado. O que você já conquistou continua contando.':'O dia ficou sem registro.');
 }catch(error){toast(error.message);render();if(inDetails)openDetails(id,day)}finally{state.busy=false}
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action="quick-outcome"]');if(!button)return;
 const g=state.goals.find(g=>g.id===button.dataset.id);if(!g)return;
 const requested=button.dataset.status;
 await saveOutcome(g.id,today(),outcomeOf(g,today())===requested?null:requested);
});
$('#progressContent').addEventListener('change',event=>{if(event.target.id==='historyFilter'){historyFilter=event.target.value;historyPage=0;renderPastHistory()}});
$('#progressContent').addEventListener('click',async event=>{
 const outcome=event.target.closest('[data-outcome]');if(outcome){await saveOutcome(detailId,outcome.dataset.outcomeDay,outcome.dataset.outcome==='clear'?null:outcome.dataset.outcome);return}
 const past=event.target.closest('[data-past-day]');if(past){if(past.hasAttribute('data-open-day')){$('#routineDay').value=past.dataset.pastDay;renderRoutineChecks();$('#routineDay').scrollIntoView({block:'center'})}else await saveOutcome(detailId,past.dataset.pastDay,past.dataset.pastStatus);return}
 const select=event.target.closest('[data-select-day]');if(select){$('#routineDay').value=select.dataset.selectDay;renderRoutineChecks();$('#routineDay').scrollIntoView({block:'center'});return}
 const page=event.target.closest('[data-history-page]');if(page){historyPage+=Number(page.dataset.historyPage);renderPastHistory()}
});
$('#progressContent').addEventListener('submit',async event=>{if(event.target.id!=='urgeForm')return;event.preventDefault();await changeEntry(detailId,{key:'urge:'+crypto.randomUUID(),day:$('#routineDay').value,done:true,note:$('#urgeNote').value.trim()})});

let detailId;
function openDetails(id,day){clearItemCelebration();if(detailId!==id){historyFilter='pending';historyPage=0}detailId=id;const g=state.goals.find(g=>g.id===id);if(!g)return;const p=planOf(g);$('#progressTitle').textContent=g.title;let html=`<p class="deadline">${deadline(g)}</p>${p.notes?`<p class="plan-notes">${esc(p.notes)}</p>`:''}`;if(p.kind==='list'){html+=`<p class="muted">${progress(g)} de ${targetOf(g)} etapas concluídas. A data planejada pode ser futura; marque quando concluir.</p><label for="entryDay">Data de conclusão</label><input id="entryDay" type="date" value="${today()}" max="${today()}"><div class="plan-items">${p.items.map(i=>{const e=(g.entries||[]).find(e=>e.key===i.id);return `<div class="plan-item"><div><strong>${esc(i.title)}</strong><small>${i.date?'Planejado: '+prettyDay(i.date):'Sem data'}${e?' · Feito: '+prettyDay(e.day):''}</small></div><button class="secondary" data-entry-key="${i.id}" aria-pressed="${!!e}">${e?'Desfazer':'Concluir'}</button></div>`}).join('')}</div>`}else if(p.kind==='amount'){html+=`<p>${fmt(progress(g))} de ${fmt(targetOf(g))} ${esc(unit(g))}</p><form id="amountForm"><label for="entryValue">Quanto você avançou (${esc(unit(g))})?</label><input id="entryValue" type="number" min="0.01" max="1000000000" step="0.01" required><label for="entryDay">Data do registro</label><input id="entryDay" type="date" value="${today()}" max="${today()}" required><label for="entryNote">Anotação (opcional)</label><input id="entryNote" maxlength="300"><button class="primary wide" type="submit">Adicionar progresso</button></form><h3>Seu histórico</h3>${(g.entries||[]).slice().reverse().map(e=>`<div class="plan-item"><div><strong>${fmt(e.value)} ${esc(unit(g))}</strong><small>${prettyDay(e.day)}${e.note?' · '+esc(e.note):''}</small></div><button class="text-button" data-entry-key="${e.key}">Remover</button></div>`).join('')||'<p class="muted">Seus primeiros passos vão aparecer aqui.</p>'}`}else{html+=habitDetails(g)}$('#progressContent').innerHTML=html;if(p.kind==='habit'){if(day)$('#routineDay').value=day;renderRoutineChecks();renderPastHistory()}if(!$('#progressDialog').open)$('#progressDialog').showModal()}
function renderRoutineChecks(){
 const g=state.goals.find(g=>g.id===detailId),day=$('#routineDay').value;
 if(!validDay(day))return;
 const p=planOf(g);
 if(p.impulse){renderImpulse(g,day);return}
 if(p.dailyTarget){renderDailyQuantity(g,day);return}
 if(!p.tasks.length){$('#routineChecks').innerHTML=dayOutcomeControls(g,day);return}
 const tasks=tasksOn(g,day),allowed=day<=today()&&scheduled(g,day);
 $('#routineChecks').innerHTML=tasks.length?tasks.map(task=>{
  const key=`${day}:${task.id}`,done=(g.entries||[]).some(entry=>entry.key===key);
  return `<div class="plan-item"><strong>${esc(task.title)}</strong><button class="secondary" data-entry-key="${key}" data-entry-day="${day}" aria-pressed="${done}" ${!allowed&&!done?'disabled':''}>${p.dailyList?`${done?icon('check'):''}${done?'Feito':'Marcar'}`:done?'Desfazer':'Fiz'}</button></div>`;
 }).join(''):'<p class="muted">Nenhuma tarefa prevista para este dia.</p>';
 $('#routineChecks').insertAdjacentHTML('beforeend',dayOutcomeControls(g,day,false));
 if(!allowed)$('#routineChecks').insertAdjacentHTML('beforeend','<p class="muted">Este dia está fora da rotina, do período ou ainda não chegou.</p>');
}
let itemCelebrationTimer;
function clearItemCelebration(){clearTimeout(itemCelebrationTimer);$('#itemMilestone')?.remove()}
function magicalEmblem(motif,kind='day'){const edition=window.DreamThemes?.current,art=edition?.celebrationAsset;if(art)return `<div class="milestone-enchantment painted-enchantment" aria-hidden="true" data-scene="${kind}" style="--celebration-art:url('${esc(art)}');--atlas-final-y:${edition.celebrationFinalRow??100}%"><div class="milestone-aura"></div><div class="potion-sprite"></div><div class="painted-glints">${Array.from({length:6},(_,i)=>`<span style="--glint-delay:${i*180}ms;--glint-x:${[22,76,15,83,30,68][i]}%;--glint-y:${[32,24,60,57,80,78][i]}%">${icon('star')}</span>`).join('')}</div></div>`;return `<div class="milestone-enchantment" aria-hidden="true"><div class="milestone-aura"></div><div class="milestone-sigil">${icon(motif)}</div><div class="milestone-sparks">${Array.from({length:12},(_,i)=>`<span style="--spark-x:${Math.round(Math.cos(i*Math.PI/6)*140)}px;--spark-y:${Math.round(Math.sin(i*Math.PI/6)*115)}px;--spark-delay:${i*45}ms;--spark-turn:${i%2?24:-24}deg">${icon(i%3===0?motif:'star')}</span>`).join('')}</div></div>`}
function celebrateDailyListItem(g,entry){
 const p=planOf(g);if(!p.dailyList||!$('#progressDialog').open)return false;
 const tasks=tasksOn(g,entry.day),item=tasks.find(t=>entry.key===`${entry.day}:${t.id}`);
 if(!item)return false;
 clearItemCelebration();
 const count=tasks.filter(t=>(g.entries||[]).some(e=>e.key===`${entry.day}:${t.id}`)).length,edition=window.DreamThemes?.current;
 const panel=document.createElement('section');panel.id='itemMilestone';panel.className='milestone item-milestone';panel.dataset.magic=edition?.atmosphere||'stars';panel.setAttribute('role','status');
 panel.innerHTML=`${magicalEmblem(edition?.progressSymbol||'star',count===tasks.length?'day':'item')}<div class="milestone-copy"><h2>${count===tasks.length?'Lista do dia concluída!':'Mais um cuidado cumprido!'}</h2><p>${esc(item.title)}</p><p class="item-completion-count">${count} de ${tasks.length} itens · ${entry.day===today()?'hoje':prettyDay(entry.day)}</p></div>`;
 $('#progressDialog').append(panel);$('#toast').hidden=true;clearTimeout(toastTimer);
 itemCelebrationTimer=setTimeout(clearItemCelebration,count===tasks.length?4500:3400);return true;
}
$('#progressDialog').addEventListener('close',clearItemCelebration);
async function changeEntry(id,body){if(state.busy)return;const g=state.goals.find(g=>g.id===id),previous=progress(g),newItem=body.done&&!(g.entries||[]).some(e=>e.key===body.key);state.busy=true;$('#progressContent').querySelectorAll('button').forEach(b=>b.disabled=true);try{if(state.demo){g.entries=(g.entries||[]).filter(e=>e.key!==body.key);if(body.done)g.entries.push({key:body.key,day:body.day,value:body.value||1,note:body.note||''});if(planOf(g).kind==='habit'&&!planOf(g).impulse){g.days=g.days.filter(d=>d!==body.day);if(planOf(g).dailyTarget?dailyTotal(g,body.day)>=planOf(g).dailyTarget:tasksOn(g,body.day).every(t=>g.entries.some(e=>e.key===`${body.day}:${t.id}`)))g.days.push(body.day);if(g.days.includes(body.day))g.failures=(g.failures||[]).filter(d=>d!==body.day)}g.redeemed=0}else Object.assign(g,await api('/'+id+'/entry','POST',body));render();openDetails(id);if($('#routineDay')){$('#routineDay').value=body.day;renderRoutineChecks()}animateProgress(g,previous);const itemCelebrated=newItem&&celebrateDailyListItem(g,body);if(!itemCelebrated&&(!body.done||$('#milestone').hidden))toast(body.done?'Mais um passo registrado.':'Registro desfeito.')}catch(e){toast(e.message);openDetails(id)}finally{state.busy=false}}
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
$('#goalForm').addEventListener('input',event=>{if(event.target.matches('#goalStart,#goalEnd,#goalWeekdays input'))syncDuration()});
$('#goalForm').addEventListener('change',event=>{if(event.target.matches('#goalStart,#goalEnd,#goalWeekdays input'))syncDuration()});
$('#goalForm').addEventListener('invalid',e=>{const row=e.target.closest('.routine-row');if(row)row.open=true},true);

$('#progressContent').addEventListener('change',e=>{if(e.target.id==='routineDay')renderRoutineChecks()});
$('#progressContent').addEventListener('click',async e=>{const b=e.target.closest('[data-entry-key],[data-routine-day]');if(!b)return;if(b.dataset.routineDay){const day=b.dataset.routineDay;await changeDay(detailId,day);openDetails(detailId);$('#routineDay').value=day;renderRoutineChecks();return}const g=state.goals.find(g=>g.id===detailId),entry=(g.entries||[]).find(e=>e.key===b.dataset.entryKey),day=b.dataset.entryDay||entry?.day||$('#entryDay')?.value||today();await changeEntry(detailId,{key:b.dataset.entryKey,day,done:!entry});if($('#routineDay')&&b.dataset.entryDay){$('#routineDay').value=day;renderRoutineChecks()}});
$('#progressContent').addEventListener('submit',async e=>{if(e.target.id!=='amountForm')return;e.preventDefault();await changeEntry(detailId,{key:crypto.randomUUID(),day:$('#entryDay').value,value:Number($('#entryValue').value),note:$('#entryNote').value.trim(),done:true})});
function renderDailyQuantity(g,day){
 const p=planOf(g),total=dailyTotal(g,day),allowed=day<=today()&&scheduled(g,day),entries=(g.entries||[]).filter(e=>e.day===day);
 $('#routineChecks').innerHTML=`<p class="daily-summary">${fmt(total)} de ${fmt(p.dailyTarget)} ${esc(p.unit)} · ${g.days.includes(day)?'Dia feito':`Faltam ${fmt(Math.max(0,p.dailyTarget-total))} ${esc(p.unit)}`}</p><div class="progress" role="progressbar" aria-label="Quantidade do dia" aria-valuemin="0" aria-valuemax="${p.dailyTarget}" aria-valuenow="${Math.min(total,p.dailyTarget)}"><span style="width:${Math.min(100,total/p.dailyTarget*100)}%">${progressToken()}</span></div>${allowed?`<form id="dailyAmountForm"><label for="dailyValue">Adicionar quantidade (${esc(p.unit)})</label><input id="dailyValue" type="number" min="0.01" max="1000000000" step="0.01" required><button class="primary wide" type="submit">Registrar quantidade</button></form>`:'<p class="muted">Este dia está fora da rotina, do período ou ainda não chegou.</p>'}<div>${entries.map(e=>`<div class="plan-item"><strong>${fmt(e.value)} ${esc(p.unit)}</strong><button class="text-button" data-entry-key="${e.key}" data-entry-day="${day}">Remover</button></div>`).join('')}</div>${dayOutcomeControls(g,day,false)}`;
}
$('#progressContent').addEventListener('submit',async e=>{if(e.target.id!=='dailyAmountForm')return;e.preventDefault();await changeEntry(detailId,{key:crypto.randomUUID(),day:$('#routineDay').value,value:Number($('#dailyValue').value),done:true})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="details"],[data-action="history"],[data-action="record"]');if(b){const g=state.goals.find(g=>g.id===b.dataset.id);openDetails(b.dataset.id,b.dataset.day||(b.dataset.action==='history'?pendingPastDays(g,today())[0]:undefined));if(b.dataset.action==='history')$('#pastHistoryTitle')?.scrollIntoView({block:'start'})}});

// The shelf is derived from persisted records, independent of reward redemption or edition.
function completionDay(g){
 const p=planOf(g),target=targetOf(g);
 if(p.kind==='habit')return [...g.days].sort()[target-1]||'';
 const entries=(g.entries||[]).filter(e=>p.kind!=='list'||p.items.some(i=>i.id===e.key)).slice().sort((a,b)=>a.day.localeCompare(b.day));
 let total=0;const seen=new Set();
 for(const e of entries){if(p.kind==='list'){if(seen.has(e.key))continue;seen.add(e.key);total++}else total=Math.round((total+e.value)*100)/100;if(total>=target)return e.day}
 return '';
}
function bookMarkup(g){return `<div class="dream-book ${esc(g.color)}"><span class="book-symbol">${goalEmoji(g)}</span><h3>${esc(g.title)}</h3><span class="book-seal">${icon('check')} Tydream realizado</span></div>`}
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
 const nav=`<div class="collection-tabs" role="group" aria-label="Sua coleção"><button class="secondary" data-action="collection-shelf" aria-pressed="${collectionView==='shelf'}">Prateleira</button><button class="secondary" data-action="collection-album" aria-pressed="${collectionView==='album'}">Álbum de escritores</button></div>`;
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
 const record=selected?`<div class="shelf-selected" aria-live="polite"><span class="goal-symbol">${goalEmoji(selected)}</span><h3>${esc(selected.title)}</h3><p>Concluído em ${prettyDay(completionDay(selected))}</p><p>${fmt(progress(selected))} ${esc(unit(selected))} realizados</p>${selected.reward?`<p>${icon('gift')} ${esc(selected.reward)}</p><button class="secondary" data-action="redeem" data-id="${selected.id}" ${selected.redeemed?'disabled':''}>${selected.redeemed?'Recompensa resgatada':'Resgatar recompensa'}</button>`:''}<div class="book-actions"><button class="secondary" data-action="details" data-id="${selected.id}">Ver histórico</button><button class="secondary" data-action="edit" data-id="${selected.id}">Editar tydream</button></div></div>`:`<div class="shelf-intro"><h3>${batch.length===8?'Uma história inteira, feita de pequenos passos.':'Cada sonho realizado revela um pedaço.'}</h3><p>${batch.length===8?'Os oito livros se encontraram. Seu retrato já está guardado no álbum.':batch.length?`Faltam ${8-batch.length} tydreams para completar este retrato.`:'Ao concluir um tydream, seu primeiro livro aparece aqui.'}</p><p>Toque em um livro para revisitar a conquista.</p>${batch.length===8&&writer?'<button class="primary" data-action="collection-album">Abrir meu álbum</button>':''}</div>`;
 const shelf=`<div class="shelf-heading"><h2>Sua prateleira de conquistas</h2><p>Oito tydreams, um retrato. Uma coleção para guardar suas histórias.</p></div><div class="writer-shelf-layout"><div class="shelf-display"><div class="portrait-bookcase" aria-label="${batch.length} de 8 livros nesta prateleira">${Array.from({length:8},(_,i)=>{const g=batch[i];return g?`<button class="portrait-spine ${g.id===selectedShelfBook?'selected':''}" data-action="shelf-book" data-id="${g.id}" aria-label="${esc(g.title)}. Livro ${i+1} de 8" aria-pressed="${g.id===selectedShelfBook}">${writer?`<span class="spine-art" style="background-image:url('${portrait}');background-position:${i%4*100/3}% ${Math.floor(i/4)*100}%" aria-hidden="true"></span>`:`<span class="spine-art" aria-hidden="true">${goalEmoji(g)}</span>`}<span class="spine-caption">${esc(g.title)}</span></button>`:`<div class="portrait-spine locked-spine" aria-label="Livro ${i+1} ainda não conquistado">${icon('book')}<span>${i+1}</span></div>`}).join('')}</div><p class="shelf-progress">${batch.length} de 8 livros${writer?.unlocked?' · retrato revelado':''}</p><div class="shelf-pagination"><button class="secondary" data-action="shelf-prev" ${shelfPage===0?'disabled':''}>Anterior</button><span>Prateleira ${shelfPage+1}</span><button class="secondary" data-action="shelf-next" ${shelfPage>=pages-1?'disabled':''}>Próxima</button></div></div>${record}</div>`;
 const albumView=`<div class="shelf-heading"><h2>Álbum de escritores</h2><p>${unlocked.length} de 10 retratos conquistados · sua coleção atravessa os temas.</p></div><div class="writer-open-album ${active?'has-writer':''}"><div class="album-portrait-page">${active?`<img class="writer-portrait" src="${active.portrait}" alt="Retrato ilustrado de ${esc(active.name)}"><p>Retrato ${active.index+1} da coleção</p>`:`<div class="album-empty-portrait">${icon('book')}<p>Uma nova história<br>espera por você.</p></div>`}</div><div class="album-biography">${active?`<h3>${esc(active.name)}</h3><p class="writer-origin">${esc(active.country)}<br>${esc(active.years)}</p><p>${esc(active.bio)}</p><h4>Obras mais conhecidas</h4><ul>${active.works.map(work=>`<li>${esc(work)}</li>`).join('')}</ul><a class="secondary writer-source" href="${esc(active.source)}" target="_blank" rel="noopener noreferrer">Conhecer sua história ↗</a>`:`<h3>Grandes escritores.<br>Pequenas conquistas.</h3><p>A cada oito tydreams realizados, um retrato completo ganha lugar neste álbum, com sua história e obras.</p><p>São dez encontros com a literatura de diferentes países. Os próximos nomes são surpresa.</p><button class="secondary" data-action="collection-shelf">Voltar à prateleira</button>`}</div></div><div class="writer-album-slots" aria-label="Dez lugares no álbum">${album.slots.map(w=>w.unlocked?`<button class="writer-album-slot unlocked ${w.id===selectedWriter?'selected':''}" data-action="select-writer" data-writer="${w.id}" aria-pressed="${w.id===selectedWriter}"><img src="${w.portrait}" alt="" loading="lazy"><span>${esc(w.name)}</span></button>`:`<div class="writer-album-slot sealed">${icon('book')}<span>Por descobrir</span><small>${Math.max(0,(w.index+1)*8-books.length)} tydreams</small></div>`).join('')}</div>`;
 $('#content').innerHTML=`<section class="writer-collection">${nav}${collectionView==='album'?albumView:shelf}</section>`;
 if(focusKey){const match=[...document.querySelectorAll('#content [data-action]')].find(b=>b.dataset.action===focusKey.action&&b.dataset.id===focusKey.id&&b.dataset.writer===focusKey.writer);match?.focus({preventScroll:true})}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='collection-shelf'||action==='collection-album'){collectionView=action==='collection-album'?'album':'shelf';renderShelf()}
 if(action==='collection-retry')renderShelf();
 if(action==='shelf-book'){selectedShelfBook=b.dataset.id;renderShelf()}
 if(action==='select-writer'){selectedWriter=b.dataset.writer;renderShelf()}
 if(action==='shelf-prev'||action==='shelf-next'){shelfPage+=action==='shelf-next'?1:-1;selectedShelfBook=null;renderShelf()}
});
const milestoneQueue=new Map(),milestoneMemory=new Set();
let milestoneTimer;
function resetMilestonePanel(){milestoneQueue.clear();clearTimeout(milestoneTimer);$('#milestone').hidden=true}
function milestoneKey(key){return `${state.demo?'demo':'real'}:${key}`}
function milestoneSeen(key){const k=milestoneKey(key);try{return milestoneMemory.has(k)||localStorage.getItem('tiny-dreams-celebrated:'+k)==='1'}catch{return milestoneMemory.has(k)}}
function rememberMilestone(key){const k=milestoneKey(key);milestoneMemory.add(k);if(!state.demo)try{localStorage.setItem('tiny-dreams-celebrated:'+k,'1')}catch{}}
function seedMilestones(){for(const g of state.goals){if(complete(g))rememberMilestone('dream:'+g.id);if(dayDone(g,today()))rememberMilestone('day:'+g.id+':'+today())}}
function celebrateMilestone(g,previous){
 if(progress(g)<=previous){milestoneQueue.delete(g.id);if($('#milestone').dataset.goal===g.id)$('#milestone').hidden=true;return}
 if(complete(g)&&previous<targetOf(g)&&!milestoneSeen('dream:'+g.id))milestoneQueue.set(g.id,{id:g.id,kind:'dream'});
 else if(planOf(g).kind==='habit'&&dayDone(g,today())&&!milestoneSeen('day:'+g.id+':'+today()))milestoneQueue.set(g.id,{id:g.id,kind:'day',day:today()});
 flushMilestones();
}
function flushMilestones(){
 if(document.hidden||document.querySelector('dialog[open]'))return;
 const candidates=[...milestoneQueue.values()].filter(m=>{const g=state.goals.find(g=>g.id===m.id);return g&&(m.kind==='dream'?complete(g):m.day===today()&&dayDone(g,today()))});milestoneQueue.clear();
 if(!candidates.length)return;
 const m=candidates.find(m=>m.kind==='dream')||candidates.at(-1),g=state.goals.find(g=>g.id===m.id);
 for(const item of candidates){rememberMilestone(item.kind==='dream'?'dream:'+item.id:'day:'+item.id+':'+today());if(item.kind==='dream')rememberMilestone('day:'+item.id+':'+today())}
 const habits=state.goals.filter(g=>planOf(g).kind==='habit'&&scheduled(g,today())&&(!complete(g)||dayDone(g,today())));
 const allToday=habits.length&&habits.every(g=>dayDone(g,today())),wholeDay=allToday&&!milestoneSeen('today:'+today());
 if(wholeDay&&m.kind!=='dream')rememberMilestone('today:'+today());
 const edition=window.DreamThemes?.current;
 const motif=edition?.progressSymbol||'star',atmosphere=edition?.atmosphere||'stars';
 const panel=$('#milestone');panel.dataset.goal=g.id;panel.dataset.magic=atmosphere;panel.dataset.edition=edition?.id||'';panel.classList.toggle('final-chapter',m.kind==='dream');
 const enchantment=magicalEmblem(motif,m.kind);
 panel.innerHTML=`<button class="icon-button milestone-close" data-action="dismiss-milestone" aria-label="Fechar celebração">×</button>${enchantment}${m.kind==='dream'?bookMarkup(g):''}<div class="milestone-copy"><h2>${m.kind==='dream'?'Seu tydream virou uma história realizada.':wholeDay?'Tudo de hoje concluído.':'Dia concluído.'}</h2><p>${m.kind==='dream'?esc(g.title):wholeDay?`${habits.length} hábitos de hoje concluídos.`:`${esc(g.title)} · ${fmt(progress(g))} de ${fmt(targetOf(g))} ${esc(unit(g))}`}</p>${m.kind==='dream'&&g.reward?`<p>Recompensa liberada: ${esc(g.reward)}</p>`:''}<button class="secondary" data-action="${m.kind==='dream'?'open-shelf':'dismiss-milestone'}">${m.kind==='dream'?'Ver na minha prateleira':'Continuar'}</button></div>`;
 $('#toast').hidden=true;clearTimeout(toastTimer);panel.hidden=false;clearTimeout(milestoneTimer);if(m.kind!=='dream')milestoneTimer=setTimeout(()=>panel.hidden=true,10000);
}
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='dismiss-milestone')$('#milestone').hidden=true;if(action==='open-shelf'||action==='back-dreams'){$('#milestone').hidden=true;state.view=action==='open-shelf'?'shelf':'dreams';render();$('#content').scrollIntoView({block:'start'});document.querySelector(`[data-view="${state.view}"]`).focus()}});
new MutationObserver(flushMilestones).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
document.addEventListener('visibilitychange',flushMilestones);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#milestone').hidden){$('#milestone').hidden=true;clearTimeout(milestoneTimer)}});
$('#dateLabel').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Sao_Paulo'});load();

document.addEventListener('dreameditionchange',()=>{if(!state.busy)render()});

$('#goalTarget').addEventListener('invalid',()=>{if(!$('#durationInfo').hidden)$('#durationInfo').open=true});
document.addEventListener('click',event=>{const info=$('#durationInfo');if(info.open&&!info.contains(event.target))info.open=false});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#durationInfo').open){$('#durationInfo').open=false;$('#durationInfo summary').focus();event.preventDefault()}});

document.addEventListener('click',event=>{if(event.target.closest('[data-action="not-started"]'))toast('Ainda não começou');});

const celebrationArtWarmed=new Set();
function warmCelebrationArt(){const asset=window.DreamThemes?.current?.celebrationAsset;if(asset&&!celebrationArtWarmed.has(asset)){celebrationArtWarmed.add(asset);const art=new Image();art.src=asset}}
document.addEventListener('dreameditionchange',warmCelebrationArt);warmCelebrationArt();
