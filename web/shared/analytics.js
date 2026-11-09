import {planOf,scheduled,validDay,weekday,targetOf,outcomeOf,progress,impulseElapsed,completionMode,habitSequence} from './planner.js';

// Daily habits alone have comparable outcomes. Never mix money, list items or
// elapsed impulse timers with practice-day denominators.
export function analyzeHabits(goals,asOf){
 const bucket=label=>({label,success:0,failure:0,missing:0,goals:new Set()});
 const duration=['até 7 dias','8–21 dias','22–60 dias','mais de 60 dias'].map(bucket);
 const frequency=['1–3 dias/semana','4–6 dias/semana','todos os dias'].map(bucket);
 const phase=['primeiro terço','terço do meio','último terço'].map(bucket);
 const weekdays=['seg','ter','qua','qui','sex','sáb','dom'].map(bucket);
 let habits=0;
 for(const g of goals){
  const p=planOf(g);if(p.kind!=='habit'||p.impulse)continue;
  habits++;
  const size=targetOf(g),groups=[duration[size<=7?0:size<=21?1:size<=60?2:3],frequency[p.weekdays.length<=3?0:p.weekdays.length<=6?1:2]];
  const dates=new Set([...(g.days||[]),...(g.failures||[])]);
  const start=p.start||(g.created_at?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(g.created_at)):'');
  if(validDay(start)&&start<asOf){
   const end=p.end&&p.end<asOf?p.end:asOf;
   for(const d=new Date(start+'T12:00:00Z');d.toISOString().slice(0,10)<end;d.setUTCDate(d.getUTCDate()+1))dates.add(d.toISOString().slice(0,10));
   if(end<asOf)dates.add(end);
  }
  for(const day of dates){
   if(!validDay(day)||day>=asOf||!scheduled(g,day))continue;
   const result=outcomeOf(g,day,asOf);
   const key=(g.days||[]).includes(day)?'success':(g.failures||[]).includes(day)?'failure':result==='failure'?'missing':null;
   if(!key)continue;
   const stages=[];
   if(p.start&&p.end){const span=Date.parse(p.end)-Date.parse(p.start)+86400000;const position=(Date.parse(day)-Date.parse(p.start))/span;stages.push(phase[Math.min(2,Math.floor(position*3))]);}
   for(const b of [...groups,...stages,weekdays[(weekday(day)+6)%7]]){b[key]++;if(key!=='missing')b.goals.add(g.id)}
  }
 }
 const finish=rows=>rows.map(b=>({...b,goals:b.goals.size,total:b.success+b.failure,rate:b.success+b.failure?100*b.failure/(b.success+b.failure):null}));
 return {habits,duration:finish(duration),frequency:finish(frequency),phase:finish(phase),weekdays:finish(weekdays)};
}

// Each dream retains its own unit and denominator. Activity counts dream-days,
// never raw entries (a task checklist must not outweigh a single check-in).
export function analyzeDreams(goals,asOf,now=Date.now()){
 const visibleDay=day=>validDay(day)&&day<=asOf;
 const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
 const activity=Array.from({length:7},(_,i)=>{
  const date=new Date(asOf+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-6+i);
  return {day:date.toISOString().slice(0,10),dreams:0};
 });
 const dreams=goals.map(g=>{
  const p=planOf(g),days=[...new Set((g.days||[]).filter(visibleDay))],failures=[...new Set((g.failures||[]).filter(visibleDay))];
  const entries=(g.entries||[]).filter(e=>visibleDay(e.day)&&(p.kind!=='list'||p.items.some(item=>item.id===e.key)));
  const snapshot={...g,days,failures,entries};
  const elapsed=p.impulse?impulseElapsed(snapshot,now).seconds:0;
  const value=p.impulse?elapsed/86400:p.kind==='habit'&&completionMode(p)==='streak'
   ?(()=>{const sequence=habitSequence(snapshot,asOf);return sequence.completedOn?targetOf(snapshot):sequence.current})():progress(snapshot);
  const target=targetOf(snapshot),ratio=target>0?Math.max(0,Math.min(100,100*value/target)):null;
  const type=p.kind==='amount'?'quantia acumulada':p.kind==='list'?'lista única':p.impulse?'resistir a um impulso':p.dailyList?'lista diária':p.dailyCounter?'contador diário':p.dailyTarget?'quantidade diária':p.tasks.length?'rotina com tarefas':'hábito';
  const unit=p.kind==='amount'?p.unit||'unidades':p.kind==='list'?'itens':p.impulse?'horas':completionMode(p)==='streak'?'dias seguidos':'dias concluídos';
  const active=new Set([...days,...failures,...entries.map(e=>e.day)]);
  for(const bucket of activity)if(active.has(bucket.day))bucket.dreams++;
  return {id:g.id,title:g.title,type,unit,value:p.impulse?elapsed/3600:value,target:p.impulse?target*24:target,ratio,
   done:target>0&&value>=target,success:days.length,failure:failures.length,entries:entries.length,
   // Partial quantities/tasks and resisted urges remain visible without claiming a completed day.
   detail:p.kind==='habit'?(p.impulse?`${entries.length} impulsos resistidos · ${failures.length} recaídas`:p.dailyTarget?`${number(Math.round(entries.reduce((n,e)=>n+e.value,0)*100)/100)} ${p.unit} registrados · ${days.length} dias concluídos`:p.tasks.length?`${entries.length} itens registrados · ${days.length} dias concluídos`:`${days.length} dias concluídos · ${failures.length} falhas registradas`):`${entries.length} registros`};
 });
 return {dreams,activity,total:dreams.length,completed:dreams.filter(d=>d.done).length};
}
