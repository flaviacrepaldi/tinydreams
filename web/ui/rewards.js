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
function rewardArtSource(g){return rewardArt(g).asset||'/garden.png'}
function rewardArtGeometry(g){
 const geometry=rewardArt(g).geometry;
 return geometry?{ratio:geometry.sceneRatio,sheet:geometry.height/(geometry.width/geometry.sceneRatio),height:geometry.height,scene:geometry.width/geometry.sceneRatio}:{ratio:1.5,sheet:1,height:1024,scene:1024};
}
function rewardReveal(g){
 const fraction=Math.max(0,Math.min(1,progress(g)/targetOf(g))),pieces=Math.floor(fraction*16),asset=rewardArtSource(g),geometry=rewardArtGeometry(g);
 return `<div class="reward-reveal ${fraction===1?'is-complete':''}" role="img" aria-label="gravura da jornada: ${Math.round(fraction*100)}% revelada" style="--journey-art:url('${esc(asset)}');--journey-ratio:${geometry.ratio};--journey-sheet-height:${geometry.sheet*400}%">${Array.from({length:16},(_,i)=>{const part=Math.max(0,Math.min(1,fraction*16-i));return `<span class="reveal-piece ${part>0?'revealed':''}" style="--tile-x:${i%4*100/3}%;--tile-y:${Math.floor(i/4)*geometry.scene/(4*geometry.height-geometry.scene)*100}%;--tile-hidden:${(1-part)*100}%" aria-hidden="true"></span>`}).join('')}</div>`;
}
function rewardJourney(g,open=false){
 const pieces=Math.floor(Math.max(0,Math.min(1,progress(g)/targetOf(g)))*16);
 return `<details class="reward-journey" ${open?'open':''}><summary>${complete(g)?'sua gravura conquistada':'sua gravura em formação'}<span>${pieces}/16</span></summary>${rewardReveal(g)}</details>`;
}
function rewardPeek(g){return `<button type="button" class="reward-journey-peek" data-reward-journey="${esc(g.id)}" aria-label="abrir sua gravura da jornada" title="sua gravura da jornada">${rewardReveal(g)}</button>`}
function rewardBookFinish(g){
 const number=targetOf(g),label=number>=1000?new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(number):fmt(number);
 const seal=practiceSeal(number).replace('>'+fmt(number)+'</span>','>'+esc(label)+'</span>');
 return `<span class="book-journey-art" aria-hidden="true" style="background-image:url('${esc(rewardArtSource(g))}');--journey-sheet-height:${rewardArtGeometry(g).sheet*100}%"></span><span class="book-journey-seal" style="--book-number-size:${label.length>3?9:12}px" aria-label="meta conquistada: ${esc(fmt(number))} ${esc(unit(g))}">${seal}</span>`;
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
 if(scenario==='art'){openDetails(g.id,today());const journey=$('#progressContent .reward-journey');journey.open=true;journey.scrollIntoView({block:'center'});return}
 if(scenario==='item'||scenario==='fusion'){openDetails(g.id,today(),true);await changeEntry(g.id,{key:today()+':'+(scenario==='fusion'?'veg':'fruit'),day:today(),value:1,done:true});}
 else await saveOutcome(g.id,today(),'success');
}
document.addEventListener('click',event=>{
 const journey=event.target.closest('[data-reward-journey]');if(journey){dismissMilestone(false);openDetails(journey.dataset.rewardJourney,today());const detail=$('#progressContent .reward-journey');if(detail){detail.open=true;detail.scrollIntoView({block:'center'})}return;}
 const button=event.target.closest('[data-reward-demo],[data-action="reward-demo-open"]');if(!button)return;
 if(button.dataset.rewardDemo)rewardDemo(button.dataset.rewardDemo);
 else{$('#settingsDialog').close();showDialog($('#rewardDemoDialog'))}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)rewardCancelFlights()});

new MutationObserver(()=>{if(document.documentElement.dataset.celebrationMotion==='paused')rewardCancelFlights()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-celebration-motion']});
