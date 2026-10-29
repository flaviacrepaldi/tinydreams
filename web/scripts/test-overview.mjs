import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {planOf,complete,dayDone,progress,targetOf,completionMode,daysUntil} from '../shared/planner.js';

const source=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
const renderSource=source.slice(source.indexOf('function render(){'),source.indexOf('function fitDreamGalleries(){'));
const elements=Object.fromEntries(['#demoBanner','#goalsCount','#content'].map(id=>[id,{}]));
let day='2026-10-29';
const goal={id:'aerobic',title:'Fazer aeróbico',target:30,days:['2026-10-28'],entries:[],plan:{...planOf({}),start:'2026-10-28'}};
const state={goals:[goal],groups:[],view:'dreams',demo:false};
const context=vm.createContext({state,planOf,complete,dayDone,progress,targetOf,completionMode,daysUntil,today:()=>day,
  $:id=>elements[id],document:{body:{dataset:{}},querySelectorAll:()=>[]},
  esc:String,icon:()=>'',goalCard:g=>`<article data-goal="${g.id}"></article>`,
  fitDreamGalleries(){},fitAmountTrends(){},requestAnimationFrame(){}});
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
