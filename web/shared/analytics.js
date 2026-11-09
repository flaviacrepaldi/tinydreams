import {planOf,scheduled,validDay,weekday,targetOf,outcomeOf,habitCompletionDay} from './planner.js';

// Daily habits alone have comparable outcomes. Never mix money, list items or
// elapsed impulse timers with practice-day denominators.
export function analyzeHabits(goals,asOf,{since='',includeToday=false}={}){
 const bucket=label=>({label,success:0,failure:0,partial:0,missing:0,goals:new Set()});
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
   const recorded=(g.days||[]).includes(day)||(g.failures||[]).includes(day);
   if(!validDay(day)||day<since||day>asOf||day===asOf&&!includeToday||(p.skippedDays||[]).includes(day)||!recorded&&!scheduled(g,day))continue;
   const result=outcomeOf(g,day,asOf);
   const key=(g.days||[]).includes(day)?'success':(g.failures||[]).includes(day)?'failure':day<asOf&&result==='failure'?((g.entries||[]).some(e=>e.day===day)?'partial':'missing'):null;
   if(!key)continue;
   const stages=[];
   if(p.start&&p.end&&day>=p.start&&day<=p.end){const span=Date.parse(p.end)-Date.parse(p.start)+86400000;const position=(Date.parse(day)-Date.parse(p.start))/span;stages.push(phase[Math.min(2,Math.floor(position*3))]);}
   for(const b of [...groups,...stages,weekdays[(weekday(day)+6)%7]]){b[key]++;if(key==='success'||key==='failure')b.goals.add(g.id)}
  }
 }
 const finish=rows=>rows.map(b=>({...b,goals:b.goals.size,total:b.success+b.failure,rate:b.success+b.failure?100*b.failure/(b.success+b.failure):null}));
 return {habits,duration:finish(duration),frequency:finish(frequency),phase:finish(phase),weekdays:finish(weekdays)};
}

// One status per dream/date. Recorded outcomes remain authoritative even after
// schedule edits; unmarked days use the current schedule and are never failures.
export function analyzeTimeline(goals,asOf,length=28){
 const days=Array.from({length},(_,i)=>{const d=new Date(asOf+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-length+1+i);return d.toISOString().slice(0,10)});
 const rows=goals.map(g=>{
  const p=planOf(g),success=new Set(g.days||[]),failure=new Set(g.failures||[]);
  const entries=(g.entries||[]).filter(e=>validDay(e.day)&&e.day<=asOf&&(p.kind!=='list'||p.items.some(i=>i.id===e.key)));
  const start=p.start||(g.created_at?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(g.created_at)):asOf);
  const finished=p.kind==='habit'&&!p.impulse&&!p.end?habitCompletionDay({...g,days:[...success].filter(day=>day<=asOf)}):'';
  const cells=days.map(day=>{
   const records=entries.filter(e=>e.day===day);
   let status='rest';
   if(p.kind==='habit'){
    if(success.has(day))status='success';
    else if(failure.has(day))status='failure';
    else if(records.length)status=p.impulse?'activity':'partial';
    else if(!p.impulse&&day>=start&&scheduled(g,day)&&(!finished||day<=finished))status=day===asOf?'pending':'missing';
   }else if(records.length)status='activity';
   return {day,status,value:p.kind==='amount'?Math.round(records.reduce((n,e)=>n+e.value,0)*100)/100:p.kind==='list'?new Set(records.map(e=>e.key)).size:records.length};
  });
  const counts={success:0,failure:0,partial:0,missing:0};
  if(p.kind==='habit'&&!p.impulse)for(const c of cells)if(c.day<asOf&&c.status in counts)counts[c.status]++;
  const type=p.kind==='amount'?'quantia acumulada':p.kind==='list'?'lista única':p.impulse?'impulso':p.dailyList?'lista diária':p.dailyCounter?'contador diário':p.dailyTarget?'quantidade diária':p.tasks.length?'rotina com tarefas':'hábito';
  return {id:g.id,title:g.title,kind:p.kind,impulse:!!p.impulse,type,unit:p.unit||'unidades',cells,counts};
 });
 const activity=days.slice(-7).map(day=>{const counts={success:0,failure:0,partial:0,activity:0};for(const row of rows){const c=row.cells.find(c=>c.day===day);if(c.status in counts)counts[c.status]++}return {day,...counts,total:Object.values(counts).reduce((n,v)=>n+v,0)}});
 return {days,rows,activity};
}
