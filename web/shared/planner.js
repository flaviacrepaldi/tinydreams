export const validDay = day => typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day+'T12:00:00Z')) && new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day && day>='2000-01-01' && day<='2100-12-31';
export const weekday = day => new Date(day+'T12:00:00Z').getUTCDay();
export const planOf = g => g.plan || {kind:'habit',start:'',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};
export function validatePlan(p){
 if(!p || !['habit','list','amount'].includes(p.kind))throw Error('Escolha como acompanhar este sonho.');
 if((p.start&&!validDay(p.start))||(p.end&&!validDay(p.end))||(p.start&&p.end&&p.end<p.start))throw Error('Confira as datas de início e prazo.');
 if(!Array.isArray(p.weekdays)||!p.weekdays.length||p.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Escolha pelo menos um dia da semana.');
 if(typeof p.notes!=='string'||p.notes.length>2000||typeof p.unit!=='string'||p.unit.length>30)throw Error('As observações devem ter até 2000 caracteres e a unidade até 30.');
 if(!Array.isArray(p.tasks)||p.tasks.length>30||!Array.isArray(p.items)||p.items.length>120)throw Error('Use até 30 tarefas de rotina ou 120 etapas.');
 const ids=new Set();
 for(const item of [...p.tasks,...p.items]){
  if(typeof item.id!=='string'||!/^[-\w]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>200)throw Error('Cada tarefa precisa de um nome (até 200 caracteres).');
  ids.add(item.id);
  if(p.tasks.includes(item)&&(!Array.isArray(item.weekdays)||!item.weekdays.length||item.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('Escolha os dias de cada tarefa.');
  if(p.items.includes(item)&&((item.date&&!validDay(item.date))||(item.date&&p.start&&item.date<p.start)||(item.date&&p.end&&item.date>p.end)))throw Error('As datas das etapas devem ficar dentro do período do sonho.');
 }
 if(p.kind==='habit'&&p.tasks.length&&p.weekdays.some(d=>!p.tasks.some(t=>t.weekdays.includes(d))))throw Error('Adicione pelo menos uma tarefa para cada dia da rotina.');
 if(p.kind==='list'&&!p.items.length)throw Error('Adicione pelo menos uma etapa, livro ou consulta.');
 return p;
}
export function scheduled(g,day){const p=planOf(g);return (!p.start||day>=p.start)&&(!p.end||day<=p.end)&&p.weekdays.includes(weekday(day));}
export function tasksOn(g,day){return planOf(g).tasks.filter(t=>t.weekdays.includes(weekday(day)));}
export function progress(g){const p=planOf(g);if(p.kind==='amount')return Math.round((g.entries||[]).reduce((n,e)=>n+e.value,0)*100)/100;if(p.kind==='list')return p.items.filter(i=>(g.entries||[]).some(e=>e.key===i.id)).length;return g.days.length;}
export const targetOf = g => planOf(g).kind==='list'?planOf(g).items.length:g.target;
export const complete = g => progress(g)>=targetOf(g);
export function dayDone(g,day){return g.days.includes(day);}
