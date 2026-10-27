import {planOf, scheduled, complete, targetOf} from './planner.js';
const calendarDateFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});

// Presentation only: a planned sticker is never a completion record.
export function calendarState(goal, day, asOf) {
  const plan = planOf(goal), entries = goal.entries || [];
  const dayEntries = entries.filter(entry => entry.day === day);
  let done = false, planned = false;
  if (plan.kind === 'habit') {
    done = goal.days.includes(day);
    const start = plan.start || (goal.created_at ? calendarDateFormatter.format(new Date(goal.created_at)) : asOf);
    const finished = complete(goal) && !plan.end ? [...goal.days].sort()[targetOf(goal)-1] : '';
    planned = day >= start && scheduled(goal, day) && (!finished || day <= finished);
  } else if (plan.kind === 'list') {
    planned = plan.items.some(item => item.date === day);
    done = plan.items.some(item => dayEntries.some(entry => entry.key === item.id));
  } else {
    planned = plan.end === day;
    if (complete(goal)) {
      let sum = 0, reached = '';
      for (const entry of [...entries].sort((a,b) => a.day.localeCompare(b.day))) {
        sum = Math.round((sum + entry.value) * 100) / 100;
        if (sum >= targetOf(goal)) { reached = entry.day; break; }
      }
      done = reached === day;
    }
  }
  const failed = (goal.failures || []).includes(day);
  const partial = !done && !failed && dayEntries.length > 0;
  return {planned, done, failed, partial, visible:planned || done || failed || partial,
    status:done ? 'feito' : failed ? 'não cumprido' : partial ? 'em andamento' : 'planejado'};
}
