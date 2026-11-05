import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {planOf,complete,dayDone,progress,targetOf,completionMode,daysUntil,scheduled,isArchivedIncomplete,outcomeOf} from '../shared/planner.js';

const source=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
const renderSource=source.slice(source.indexOf('function homeStatus(g)'),source.indexOf('function fitDreamGalleries(){'));
const elements=Object.fromEntries(['#demoBanner','#goalsCount','#content'].map(id=>[id,{}]));
let day='2026-10-29';
const goal={id:'aerobic',title:'Fazer aeróbico',target:30,days:['2026-10-28'],entries:[],plan:{...planOf({}),start:'2026-10-28'}};
const state={goals:[goal],groups:[],view:'dreams',homeFilter:'all',demo:false};
const context=vm.createContext({state,planOf,complete,dayDone,progress,targetOf,completionMode,daysUntil,scheduled,isArchivedIncomplete,outcomeOf,today:()=>day,completionDay:g=>g.days.at(-1),
  $:id=>elements[id],window:{matchMedia:()=>({matches:false})},document:{body:{dataset:{}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
  esc:String,icon:()=>'',goalEmoji:()=>'<svg></svg>',goalCard:g=>`<article data-goal="${g.id}"></article>`,
  fitDreamGalleries(){},fitAmountTrends(){},requestAnimationFrame(){},queueMicrotask(){},checkIncompleteNotice(){}});
vm.runInContext(renderSource,context);
const render=()=>vm.runInContext('render()',context);
render();
assert.match(elements['#content'].innerHTML,/data-goal="aerobic"/);
assert.equal(elements['#goalsCount'].textContent,1);
// Rescheduling an existing dream hides its card and its active count immediately.
goal.plan.start='2026-11-01';
render();
assert.doesNotMatch(elements['#content'].innerHTML,/data-goal="aerobic"/);
assert.equal(elements['#goalsCount'].textContent,0);
assert.deepEqual(goal.days,['2026-10-28']);
assert.equal(state.goals.length,1);
// The same rule applies inside a Big Dream.
state.groups=[{id:'health',name:'Saúde'}];goal.group_id='health';render();
assert.doesNotMatch(elements['#content'].innerHTML,/data-goal="aerobic"/);
day='2026-11-01';render();
assert.match(elements['#content'].innerHTML,/data-goal="aerobic"/);
assert.equal(elements['#goalsCount'].textContent,1);
goal.plan.start='';render();
assert.match(elements['#content'].innerHTML,/data-goal="aerobic"/);
state.groups=[];
const pending={...goal,id:'pending',plan:{...planOf({}),completionMode:'total'},days:[]};
const done={...pending,id:'done',days:[day]};
const rest={...pending,id:'rest',plan:{...pending.plan,weekdays:[1]}};
const finished={...pending,id:'finished',target:1,days:['2026-10-30']};
state.goals=[rest,done,pending,finished];render();
let html=elements['#content'].innerHTML;
assert.ok(html.indexOf('data-goal="rest"')<html.indexOf('data-goal="done"'));
assert.ok(html.indexOf('data-goal="done"')<html.indexOf('data-goal="pending"'));
assert.doesNotMatch(html,/data-goal="finished"/);
assert.match(html,/1 de 2 feitos hoje/);
assert.equal(elements['#goalsCount'].textContent,1);
assert.deepEqual(state.goals.map(g=>g.id),['rest','done','pending','finished'],'Display sorting never mutates persisted order');
state.homeFilter='today';render();
html=elements['#content'].innerHTML;
assert.match(html,/data-filter="today" aria-pressed="true"/);
assert.match(html,/data-goal="pending"/);
assert.match(html,/data-goal="done"/);
assert.doesNotMatch(html,/data-goal="rest"/);
state.homeFilter='all';render();
assert.match(elements['#content'].innerHTML,/data-goal="rest"/);
assert.match(source,/homeFilter:'today'/);
done.days=[];render();assert.equal(elements['#goalsCount'].textContent,2);
finished.days=[day];render();
assert.match(elements['#content'].innerHTML,/data-goal="finished"/,'Dream completed today stays visible');
day='2026-11-02';render();
assert.doesNotMatch(elements['#content'].innerHTML,/data-goal="finished"/,'Earlier completions remain on shelf');
day='2026-11-01';
console.log('PASS: stable ordering, visible daily completions, scheduled daily totals, undo and immutable storage order.');
console.log('PASS: rescheduled dreams stay off the home and active count until their start date, including grouped dreams, without losing history.');

// Every remaining-count card names what its number measures.
const countdownContext=vm.createContext({planOf,complete,progress,targetOf,completionMode,daysUntil,
 today:()=> '2026-10-29',fmt:n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n)});
vm.runInContext(source.slice(source.indexOf('function currencyOf(g)'),source.indexOf('function routineLabel(g)')),countdownContext);
function countdown(goal){countdownContext.goal=goal;return vm.runInContext('cardCountdown(goal)',countdownContext)}
const sample={target:3,days:[],entries:[],plan:{...planOf({}),completionMode:'total'}};
assert.match(countdown(sample).label,/conclusões/);
assert.equal(countdown({...sample,target:1}).lead,'Só falta');
assert.match(countdown({...sample,target:1}).label,/conclusão /);
assert.match(countdown({...sample,plan:{...sample.plan,completionMode:'streak'}}).label,/dias consecutivos/);
assert.match(countdown({...sample,plan:{...sample.plan,completionMode:'period',start:'2026-10-29',end:'2026-10-30'}}).label,/dias /);
assert.match(countdown({...sample,plan:{...sample.plan,completionMode:'period',start:'2026-10-29',end:'2026-10-29'}}).label,/dia /);
for(const currency of ['R$','BRL','reais']){
 const amount={...sample,plan:{...planOf({}),kind:'amount',unit:currency}};
 assert.match(countdown(amount).label,/reais/);
 assert.match(countdown({...amount,target:1}).label,/real /);
}
assert.match(countdown({...sample,plan:{...planOf({}),kind:'amount',unit:'páginas'}}).label,/páginas/);
assert.match(countdown({...sample,plan:{...planOf({}),kind:'list',items:[{id:'a'},{id:'b'}]}}).label,/conclusões/);
console.log('PASS: remaining counts name completions, days, consecutive days, reais or the custom unit, with singular/plural.');

// Skipping today's dream keeps its card as the gallery's restoration anchor.
state.homeFilter='today';state.goals=[pending,done];state.groups=[];
pending.plan={...pending.plan,skippedDays:[day]};render();
assert.match(elements['#content'].innerHTML,/data-goal="pending"/,'Skipped card remains in today');
assert.equal(elements['#goalsCount'].textContent,1,'Skipped dream no longer counts as pending');
state.groups=[{id:'health',name:'Saúde'}];pending.group_id='health';render();
assert.match(elements['#content'].innerHTML,/data-goal="pending"/,'Grouped skipped card also remains');
pending.plan={...pending.plan,skippedDays:[]};render();
assert.match(elements['#content'].innerHTML,/data-goal="pending"/);
assert.equal(elements['#goalsCount'].textContent,2,'Undo skip restores pending count');
console.log('PASS: skipping and undo retain today cards in grouped and ungrouped galleries.');
