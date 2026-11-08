'use strict';
// Presentation only: rewards derive from saved practice, never write habit records.
function rewardSequence(g){
 const p=planOf(g);if(p.kind!=='habit')return {best:0,record:false,resumed:false};
 if(p.impulse){
  const now=Date.now(),initial=Date.parse(p.impulseStartedAt||(p.start?p.start+'T00:00:00-03:00':g.created_at||''));
  let previous=Number.isFinite(initial)?initial:now,priorBest=0;
  const resets=(g.failures||[]).map(day=>Date.parse(p.impulseResets?.[day]||day+'T00:00:00-03:00')).filter(t=>Number.isFinite(t)&&t>=previous&&t<=now).sort((a,b)=>a-b);
  for(const reset of resets){priorBest=Math.max(priorBest,Math.floor((reset-previous)/86400000));previous=reset}
  const current=Math.floor(impulseElapsed(g).seconds/86400);
  return {best:Math.max(priorBest,current),record:current>=3&&current>priorBest,resumed:current===1&&resets.length>0};
 }
 let run=0,best=0,previous='',before=0,current=0;
 const skipped=p.skippedDays||[];
 for(const day of habitDays(g).filter(day=>day<=today()&&!(g.failures||[]).includes(day))){
  const connected=previous&&practiceDays(previous,day,p.weekdays)-skipped.filter(d=>d>=previous&&d<=day&&p.weekdays.includes(weekday(d))).length===2;
  run=connected?run+1:1;
  if(day===today()){before=best;current=run;}
  best=Math.max(best,run);previous=day;
 }
 return {best,record:dayDone(g,today())&&current>=3&&current>before,resumed:dayDone(g,today())&&current===1&&habitDays(g).some(d=>d<today())};
}
function rewardIntervalKey(g,number=progress(g)){return 'interval:'+g.id+':'+impulseElapsed(g).start+':'+number}
function rewardRecordBadge(g){const r=rewardSequence(g);return r.best>=3?`<span class="reward-record" title="melhor sequência: ${r.best} dias" aria-label="melhor sequência: ${r.best} dias">${icon('star')}<b>${r.best}</b></span>`:''}
function rewardAllToday(){const habits=state.goals.filter(g=>planOf(g).kind==='habit'&&visibleOnHome(g)&&scheduled(g,today()));return habits.length>0&&habits.every(g=>dayDone(g,today()))}
function rewardArt(g){
 const day=complete(g)?completionDay(g):'';
 return (day?window.DreamThemes?.forCreation(day+'T12:00:00Z'):window.DreamThemes?.current)||{};
}
// Badges are derived from persisted records, including historical corrections.
const achievementKinds=[
 {id:'first',name:'primeiro capítulo',symbol:'book',rule:'conclua seu primeiro tydream'},
 ...[7,15,30].map(n=>({id:'days'+n,name:n+' dias de jornada',symbol:'star',rule:'registre '+n+' dias de prática em um tydream',days:n})),
 {id:'theme',name:'história realizada',symbol:null,rule:'conclua um tydream nesta edição'},
 {id:'big',name:'grande sonho realizado',symbol:'target',rule:'conclua todos os tydreams de um Big Dream'}
];
function achievementEvents(){
 const events=[],finished=state.goals.filter(complete).map(g=>({g,day:completionDay(g)})).filter(e=>e.day&&e.day<=today()).sort((a,b)=>a.day.localeCompare(b.day)||a.g.id.localeCompare(b.g.id));
 const add=(kind,g,day,title=g.title)=>{if(day&&day<=today())events.push({kind,id:g.id,day,title,edition:DreamThemes.forCreation(day+'T12:00:00-03:00')})};
 if(finished.length)add('first',finished[0].g,finished[0].day);
 for(const {g,day} of finished)add('theme',g,day);
 for(const g of state.goals){if(planOf(g).kind!=='habit')continue;
  const p=planOf(g),days=[...new Set(habitDays(g))].filter(d=>d<=today()&&!(g.failures||[]).includes(d)).sort();
  for(const n of [7,15,30]){
   if(p.impulse){
    const initial=Date.parse(p.impulseStartedAt||(p.start?p.start+'T00:00:00-03:00':g.created_at||'')),now=Date.now();
    if(Number.isFinite(initial)){const ends=[...(g.failures||[]).map(day=>Date.parse(p.impulseResets?.[day]||day+'T00:00:00-03:00')).filter(t=>Number.isFinite(t)&&t>=initial&&t<=now).sort((a,b)=>a-b),now];let start=initial;
     for(const end of ends){if(end-start>=n*86400000){const d=new Date(start+n*86400000);add('days'+n,g,new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d));break}start=end}
    }
   }
   else if(days.length>=n)add('days'+n,g,days[n-1]);
  }
 }
 for(const group of state.groups){const members=state.goals.filter(g=>g.group_id===group.id);if(members.length&&members.every(complete))add('big',members[0],members.map(completionDay).sort().at(-1),group.name)}
 return events.sort((a,b)=>b.day.localeCompare(a.day));
}
function achievementMedal(kind,edition,locked=false){
 const k=achievementKinds.find(k=>k.id===kind)||achievementKinds.find(k=>k.id==='theme'),tokens=edition.tokens||{};
 return `<span class="achievement-medal ${locked?'is-locked':''}" style="--badge-ink:${esc(tokens['--accent']||'var(--accent)')};--badge-paper:${esc(tokens['--surface']||'var(--surface)')}"><span class="achievement-medal-core">${icon(k.symbol||edition.progressSymbol||'star')}${k.days?`<b>${k.days}</b>`:''}</span></span>`;
}
let selectedAchievement='';
function achievementsMarkup(){
 const events=achievementEvents(),current=DreamThemes.current,editions=[current,...events.map(e=>e.edition)].filter((e,i,list)=>list.findIndex(x=>x.id===e.id)===i).sort((a,b)=>b.id.localeCompare(a.id));
 const latest=events[0];
 return `<div class="shelf-heading"><h2>conquistas</h2><p>pequenas vitórias, guardadas nos mundos por onde você passou.</p></div>${latest?`<div class="achievement-latest">${achievementMedal(latest.kind,latest.edition)}<div><p>sua conquista mais recente</p><h3>${esc(achievementKinds.find(k=>k.id===latest.kind).name)}</h3><p data-user-content>${esc(latest.title)} · ${prettyDay(latest.day)}</p></div></div>`:'<p class="achievement-empty">seu álbum começa com o primeiro passo. cada conquista aparece aqui conforme você avança.</p>'}${editions.map(edition=>`<section class="achievement-edition"><h3>${esc(edition.name)}</h3><p class="muted">${esc(edition.month)} · ${edition.id.slice(0,4)}</p><div class="achievement-grid">${achievementKinds.filter(k=>(k.id!=='first'||!events.some(e=>e.kind==='first')||events.some(e=>e.kind==='first'&&e.edition.id===edition.id))&&(edition.id===current.id||events.some(e=>e.edition.id===edition.id&&e.kind===k.id))).map(k=>{const earned=events.filter(e=>e.edition.id===edition.id&&e.kind===k.id),key=edition.id+':'+k.id,open=selectedAchievement===key;return `<div class="achievement-item"><button class="achievement-button" data-achievement="${key}" aria-expanded="${open}" aria-controls="achievement-${key}" aria-label="${esc(k.name)} · ${earned.length?'conquistado '+earned.length+' vez(es)':'por conquistar'}">${achievementMedal(k.id,edition,!earned.length)}<strong>${esc(k.name)}</strong><span>${earned.length?earned.length>1?earned.length+' conquistas':'conquistado':'por conquistar'}</span></button><div id="achievement-${key}" class="achievement-detail" ${open?'':'hidden'}><p>${esc(k.rule)}.</p>${earned.map(e=>`<p><strong data-user-content>${esc(e.title)}</strong><br>${prettyDay(e.day)}</p>`).join('')}</div></div>`}).join('')}</div></section>`).join('')}`;
}
function openAchievements(){dismissMilestone(false);document.querySelectorAll('dialog[open]').forEach(d=>d.close());state.view='shelf';collectionView='achievements';render();const heading=document.querySelector('#content h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}document.querySelector('#content').scrollIntoView({block:'start'})}
function rewardPeek(g){const edition=rewardArt(g),kind=complete(g)?'theme':practiceAchievement(g)?'days'+practiceAchievement(g):'theme';return `<button type="button" class="reward-badge-peek" data-open-achievements aria-label="ver minhas conquistas">${achievementMedal(kind,edition)}</button>`}
function rewardBookFinish(g){
 const number=targetOf(g),label=number>=1000?new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(number):fmt(number);
 const seal=practiceSeal(number).replace('>'+fmt(number)+'</span>','>'+esc(label)+'</span>');
 return `<span class="book-journey-seal" style="--book-number-size:${label.length>3?9:12}px" aria-label="meta conquistada: ${esc(fmt(number))} ${esc(unit(g))}">${seal}</span>`;
}
function rewardHonor(g){
 const r=rewardSequence(g),number=practiceAchievement(g);
 if(number)return practiceAchievementScene(g);
 if(!r.record&&!r.resumed)return '';
 return `<div class="practice-achievement reward-honor" role="img" aria-label="${r.record?'novo recorde de '+r.best+' dias':'retomada conquistada'}">${practiceSeal(r.record?r.best:1)}<span>${r.record?'recorde':'retomada'}</span></div>`;
}
function rewardHeading(g,fallback){const r=rewardSequence(g);return r.record?'seu novo recorde.':r.resumed?'você voltou. essa conquista conta.':fallback}
function rewardFusion(count){
 const n=Math.max(1,Math.min(8,count));
 return `<div class="reward-fusion" aria-hidden="true"><span class="fusion-day">${icon('check')}</span>${Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n;return `<span class="fusion-item" style="--fusion-x:${Math.round(Math.cos(a)*58)}px;--fusion-y:${Math.round(Math.sin(a)*58)}px;--fusion-delay:${i*35}ms">${icon('check')}</span>`}).join('')}</div>`;
}
let rewardLastTouch=null;
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const r=button.getBoundingClientRect();rewardLastTouch={x:r.left+r.width/2,y:r.top+r.height/2,time:Date.now()};},true);
function rewardOrigin(){return rewardLastTouch&&Date.now()-rewardLastTouch.time<2000?{...rewardLastTouch}:null}
const rewardFlights=new Set();
function rewardCancelFlights(){for(const flight of rewardFlights){flight.animation.cancel();flight.node.remove()}rewardFlights.clear()}
function rewardFlight(from,target,number){
 if(!target||!from||document.hidden)return;
 const r=target.getBoundingClientRect();if(r.width===0||r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight)return;
 target.classList.add('reward-received');setTimeout(()=>target.classList.remove('reward-received'),900);
 if(document.documentElement.dataset.celebrationMotion!=='active'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const host=document.querySelector('dialog[open]')||document.body,rect=host===document.body?{left:0,top:0}:host.getBoundingClientRect(),node=document.createElement('span');
 node.className='reward-flight'+(number?' reward-seal-flight':'');node.setAttribute('aria-hidden','true');node.innerHTML=number?practiceSeal(number):icon('check');
 node.style.position=host===document.body?'fixed':'absolute';node.style.left=(from.x-rect.left)+'px';node.style.top=(from.y-rect.top)+'px';host.append(node);
 const dx=r.left+r.width/2-from.x,dy=r.top+r.height/2-from.y;
 const animation=node.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.5-24}px)) scale(1.15)`,opacity:1,offset:.45},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.4)`,opacity:0}],{duration:number?700:500,easing:'cubic-bezier(.16,1,.3,1)'});
 const flight={node,animation};rewardFlights.add(flight);animation.finished.catch(()=>{}).finally(()=>{node.remove();rewardFlights.delete(flight)});
}
function rewardEntryFeedback(g,entry,newItem,origin){
 if(!entry.done){rewardCancelFlights();return}
 if(!newItem)return;
 const dialog=$('#progressDialog'),activeDialog=document.querySelector('dialog[open]');
 let target=activeDialog?.querySelector('.daily-item-progress,.daily-summary,.progress,.practice-achievement,.item-completion-count,.book-seal');
 if(!target){const card=[...document.querySelectorAll('[data-goal]')].find(c=>c.dataset.goal===g.id);target=card?.querySelector('.dream-progress .progress')}
 rewardFlight(origin,target);
 const row=[...dialog.querySelectorAll('[data-entry-key]')].find(b=>b.dataset.entryKey===entry.key);
 row?.classList.add('reward-check-drawn');
}
function rewardSealReturn(){
 const panel=$('#milestone'),g=state.goals.find(g=>g.id===panel.dataset.goal),number=g&&practiceAchievement(g),seal=panel.querySelector('.practice-achievement');
 if(!g||!number||!seal||(!planOf(g).impulse&&!dayDone(g,today())))return null;
 const r=seal.getBoundingClientRect();return {id:g.id,number,from:{x:r.left+r.width/2,y:r.top+r.height/2}};
}
function rewardReturnToGrid(returning){
 if(!returning)return;
 requestAnimationFrame(()=>{const g=state.goals.find(g=>g.id===returning.id);if(!g||practiceAchievement(g)!==returning.number)return;
 const card=[...document.querySelectorAll('[data-goal]')].find(c=>c.dataset.goal===g.id);
 const cell=card?.querySelector(`[data-practice-milestone="${returning.number}"]`);rewardFlight(returning.from,cell,returning.number);
 });
}
function rewardWholeDayFeedback(){const cord=document.querySelector('.daily-keepsakes');cord?.classList.add('reward-cord-new')}
function rewardReset(){rewardCancelFlights();rewardLastTouch=null}
// Deliberately separate, in-memory examples make every effect easy to try.
async function rewardDemo(scenario){
 resetMilestonePanel();
 await Promise.all([...document.querySelectorAll('dialog[open]')].map(d=>new Promise(resolve=>{d.addEventListener('close',resolve,{once:true});d.close()})));
 showDemo();state.view='dreams';state.homeFilter='all';state.groups=[];milestoneMemory.clear();
 const p={...planOf({}),kind:'habit',completionMode:'total',start:dayBefore(20),end:'',weekdays:[0,1,2,3,4,5,6],tasks:[],items:[]};
 const g={id:'reward-demo-'+scenario+'-'+crypto.randomUUID(),title:scenario==='item'||scenario==='fusion'?'melhorar minha alimentação':'minha jornada de exemplo',target:21,color:'sage',reward:'uma pausa para ler',days:[],failures:[],entries:[],created_at:new Date().toISOString(),plan:p};
 if(scenario==='item'||scenario==='fusion'){
  p.dailyList=true;p.tasks=[{id:'fruit',title:'comer uma fruta',weekdays:p.weekdays},{id:'veg',title:'comer uma porção de vegetais',weekdays:p.weekdays}];
  if(scenario==='fusion')g.entries=[{key:today()+':fruit',day:today(),value:1}];
 }else if(scenario==='milestone'||scenario==='record'||scenario==='dream'){
  p.completionMode='streak';g.days=Array.from({length:scenario==='record'?3:6},(_,i)=>dayBefore(i+1));if(scenario==='dream')g.target=7;
 }else if(scenario==='return')g.days=[dayBefore(5),dayBefore(4)];
 else if(scenario==='art')g.days=Array.from({length:11},(_,i)=>dayBefore(i+1));
 state.goals=[g];seedMilestones();render();document.querySelector('.mobile-chapter-link')?.click();
 if(scenario==='art'){openAchievements();return}
 if(scenario==='item'||scenario==='fusion'){openDetails(g.id,today(),true);await changeEntry(g.id,{key:today()+':'+(scenario==='fusion'?'veg':'fruit'),day:today(),value:1,done:true});}
 else await saveOutcome(g.id,today(),'success');
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-open-achievements]')){openAchievements();return}
 const badge=event.target.closest('[data-achievement]');if(badge){selectedAchievement=selectedAchievement===badge.dataset.achievement?'':badge.dataset.achievement;document.querySelectorAll('[data-achievement]').forEach(button=>{const open=selectedAchievement===button.dataset.achievement;document.getElementById('achievement-'+button.dataset.achievement).hidden=!open;button.setAttribute('aria-expanded',String(open))});return;}
 const button=event.target.closest('[data-reward-demo],[data-action="reward-demo-open"]');if(!button)return;
 if(button.dataset.rewardDemo)rewardDemo(button.dataset.rewardDemo);
 else{$('#settingsDialog').close();showDialog($('#rewardDemoDialog'))}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)rewardCancelFlights()});

new MutationObserver(()=>{if(document.documentElement.dataset.celebrationMotion==='paused')rewardCancelFlights()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-celebration-motion']});
