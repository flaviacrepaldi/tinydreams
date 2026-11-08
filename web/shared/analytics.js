import {planOf,scheduled,validDay,weekday,targetOf,outcomeOf} from './planner.js';

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
