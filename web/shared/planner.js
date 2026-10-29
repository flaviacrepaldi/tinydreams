export const validDay = day => typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day+'T12:00:00Z')) && new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day && day>='2000-01-01' && day<='2100-12-31';
export const weekday = day => new Date(day+'T12:00:00Z').getUTCDay();
export const planOf = g => g.plan || {kind:'habit',start:'',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};
export const completionMode = p => p.completionMode || (p.start&&p.end?'period':'total');
export const practiceToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const needsIncompleteReview = (g,asOf=practiceToday()) => !!planOf(g).end&&planOf(g).end<asOf&&!complete(g);
export const isArchivedIncomplete = g => !!planOf(g).incompleteAccepted&&needsIncompleteReview(g);
export function validatePlan(p){
 if(p?.emoji!=null&&!validEmoji(p.emoji))throw Error('Escolha um único emoji para o sonho.');
 if(!p || !['habit','list','amount'].includes(p.kind))throw Error('Escolha como acompanhar este sonho.');
 if(p.completionMode!=null&&(p.kind!=='habit'||!['total','streak','period'].includes(p.completionMode)))throw Error('Escolha como alcançar a meta de dias.');
 if(p.kind==='habit'&&p.completionMode==='period'&&(!p.start||!p.end))throw Error('Defina o início e o término do período.');
 if(p.kind==='habit'&&p.completionMode&&p.completionMode!=='period'&&p.end)throw Error('Use um período definido para escolher uma data de término.');
 if((p.start&&!validDay(p.start))||(p.end&&!validDay(p.end))||(p.start&&p.end&&p.end<p.start))throw Error('Confira as datas de início e prazo.');
 if(!Array.isArray(p.weekdays)||!p.weekdays.length||p.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Escolha pelo menos um dia da semana.');
 if(typeof p.notes!=='string'||p.notes.length>2000||typeof p.unit!=='string'||p.unit.length>30)throw Error('As observações devem ter até 2000 caracteres e a unidade até 30.');
 if(!Array.isArray(p.tasks)||p.tasks.length>30||!Array.isArray(p.items)||p.items.length>120)throw Error('Use até 30 tarefas de rotina ou 120 etapas.');
 if(p.dailyList!=null&&typeof p.dailyList!=='boolean')throw Error('Escolha uma repetição válida para a lista.');
 if(p.dailyList&&(p.kind!=='habit'||p.impulse||p.dailyTarget||!p.tasks.length))throw Error('Adicione os itens da lista diária e uma meta de dias.');
 if(p.impulse!=null&&typeof p.impulse!=='boolean')throw Error('Escolha um modo de hábito válido.');
 if(p.support!=null&&(typeof p.support!=='string'||p.support.length>500))throw Error('Use até 500 caracteres para seu combinado.');
 if(p.impulse&&(p.kind!=='habit'||p.tasks.length||p.dailyTarget))throw Error('O hábito de resistir ao impulso tem seu próprio registro diário.');
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
export function habitDays(g){const p=planOf(g);return [...new Set(g.days)].filter(day=>!p.completionMode||scheduled(g,day)).sort();}
export function habitSequence(g,asOf=practiceToday()){
 const p=planOf(g),days=habitDays(g).filter(day=>day<=asOf&&!(g.failures||[]).includes(day));
 let current=0,previous='',completedOn='';
 for(const day of days){
  current=previous&&practiceDays(previous,day,p.weekdays)===2?current+1:1;
  if(!completedOn&&current>=targetOf(g))completedOn=day;
  previous=day;
 }
 if(previous&&(practiceDays(previous,asOf,p.weekdays)-(scheduled(g,asOf)?1:0)>1||(g.failures||[]).includes(asOf)))current=0;
 return {current,completedOn};
}
export function habitCompletionDay(g){return completionMode(planOf(g))==='streak'?habitSequence(g).completedOn:habitDays(g)[targetOf(g)-1]||'';}
export function progress(g){const p=planOf(g);if(p.kind==='amount')return Math.round((g.entries||[]).reduce((n,e)=>n+e.value,0)*100)/100;if(p.kind==='list')return p.items.filter(i=>(g.entries||[]).some(e=>e.key===i.id)).length;if(completionMode(p)==='streak'){const sequence=habitSequence(g);return sequence.completedOn?targetOf(g):sequence.current}return habitDays(g).length;}
export function targetOf(g){
 const p=planOf(g);if(p.kind==='list')return p.items.length;
 if(p.kind==='habit'&&completionMode(p)==='period'&&p.start&&p.end){const count=practiceDays(p.start,p.end,p.weekdays);if(count!==null)return count}
 return g.target;
}
export const complete = g => progress(g)>=targetOf(g);
export function dayDone(g,day){return g.days.includes(day);}

export const dailyTotal = (g,day) => Math.round((g.entries||[]).filter(e=>e.day===day).reduce((sum,e)=>sum+e.value,0)*100)/100;

export function validEmoji(value){
 if(typeof value!=='string'||!value||value.length>32)return false;
 return [...new Intl.Segmenter('pt-BR',{granularity:'grapheme'}).segment(value)].length===1&&/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3]/u.test(value);
}
export function automaticAmulet(goals=[]){
 const colors=['lavender','peach','sage'],previous=goals.at(-1)?.color;
 const candidates=colors.filter(color=>color!==previous);
 const counts=Object.fromEntries(colors.map(color=>[color,goals.filter(g=>g.color===color).length]));
 const minimum=Math.min(...candidates.map(color=>counts[color]));
 const choices=candidates.filter(color=>counts[color]===minimum);
 return choices[Math.floor(Math.random()*choices.length)];
}

// Inclusive calendar range; UTC avoids daylight-saving and device-timezone drift.
export function practiceDays(start,end,weekdays){
 if(!validDay(start)||!validDay(end)||end<start)return null;
 const first=new Date(start+'T12:00:00Z'),length=Math.round((Date.parse(end+'T12:00:00Z')-first.getTime())/86400000)+1;
 const selected=new Set(weekdays),weeks=Math.floor(length/7);let count=weeks*selected.size;
 for(let n=0;n<length%7;n++)if(selected.has((first.getUTCDay()+n)%7))count++;
 return count;
}

export function daysUntil(end,day){
 if(!validDay(end)||!validDay(day))return null;
 const difference=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000);
 return difference>=0?difference+1:difference;
}

export const outcomeOf = (g,day) => g.days.includes(day)?'success':(g.failures||[]).includes(day)?'failure':null;
export function pastPracticeDays(g,asOf){
 const p=planOf(g);if(p.kind!=='habit'||!p.start||!validDay(asOf))return [];
 const end=p.end&&p.end<asOf?p.end:asOf,days=[];
 for(const d=new Date(p.start+'T12:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)){
  const day=d.toISOString().slice(0,10);if(day<asOf&&scheduled(g,day))days.push(day);
 }
 return days;
}
export const pendingPastDays = (g,asOf) => pastPracticeDays(g,asOf).filter(day=>!outcomeOf(g,day));
