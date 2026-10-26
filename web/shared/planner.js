export const validDay = day => typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day+'T12:00:00Z')) && new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day && day>='2000-01-01' && day<='2100-12-31';
export const weekday = day => new Date(day+'T12:00:00Z').getUTCDay();
export const planOf = g => g.plan || {kind:'habit',start:'',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};
export function validatePlan(p){
 if(p?.emoji!=null&&!validEmoji(p.emoji))throw Error('Escolha um único emoji para o sonho.');
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
 if(p.dailyTarget!=null){
  if(p.kind!=='habit'||!Number.isFinite(p.dailyTarget)||p.dailyTarget<=0||p.dailyTarget>1000000000||Math.abs(Math.round(p.dailyTarget*100)-p.dailyTarget*100)>0.00001||!p.unit.trim())throw Error('Informe uma quantidade diária positiva, com até duas casas decimais, e a unidade.');
  if(p.tasks.length)throw Error('Escolha tarefas ou quantidade diária para este hábito.');
 }
 if(p.kind==='habit'&&p.tasks.length&&p.weekdays.some(d=>!p.tasks.some(t=>t.weekdays.includes(d))))throw Error('Adicione pelo menos uma tarefa para cada dia da rotina.');
 if(p.kind==='habit'&&p.start&&p.end){const count=practiceDays(p.start,p.end,p.weekdays);if(count<1||count>3650)throw Error('Escolha um período com 1 a 3650 dias da rotina.');}
 if(p.kind==='list'&&!p.items.length)throw Error('Adicione pelo menos uma etapa, livro ou consulta.');
 return p;
}
export function scheduled(g,day){const p=planOf(g);return (!p.start||day>=p.start)&&(!p.end||day<=p.end)&&p.weekdays.includes(weekday(day));}
export function tasksOn(g,day){return planOf(g).tasks.filter(t=>t.weekdays.includes(weekday(day)));}
export function progress(g){const p=planOf(g);if(p.kind==='amount')return Math.round((g.entries||[]).reduce((n,e)=>n+e.value,0)*100)/100;if(p.kind==='list')return p.items.filter(i=>(g.entries||[]).some(e=>e.key===i.id)).length;return g.days.length;}
export function targetOf(g){
 const p=planOf(g);if(p.kind==='list')return p.items.length;
 if(p.kind==='habit'&&p.start&&p.end){const count=practiceDays(p.start,p.end,p.weekdays);if(count!==null)return count}
 return g.target;
}
export const complete = g => progress(g)>=targetOf(g);
export function dayDone(g,day){return g.days.includes(day);}

export const dailyTotal = (g,day) => Math.round((g.entries||[]).filter(e=>e.day===day).reduce((sum,e)=>sum+e.value,0)*100)/100;

export function validEmoji(value){
 if(typeof value!=='string'||!value||value.length>32)return false;
 return [...new Intl.Segmenter('pt-BR',{granularity:'grapheme'}).segment(value)].length===1&&/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3]/u.test(value);
}
export const automaticAmulet = title => ['lavender','peach','sage'][[...title].reduce((sum,c)=>sum+c.codePointAt(0),0)%3];

// Inclusive calendar range; UTC avoids daylight-saving and device-timezone drift.
export function practiceDays(start,end,weekdays){
 if(!validDay(start)||!validDay(end)||end<start)return null;
 const first=new Date(start+'T12:00:00Z'),length=Math.round((Date.parse(end+'T12:00:00Z')-first.getTime())/86400000)+1;
 const selected=new Set(weekdays),weeks=Math.floor(length/7);let count=weeks*selected.size;
 for(let n=0;n<length%7;n++)if(selected.has((first.getUTCDay()+n)%7))count++;
 return count;
}
