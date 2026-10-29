import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {planOf,complete,dayDone} from '../shared/planner.js';

const source=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
const renderSource=source.slice(source.indexOf('function render(){'),source.indexOf('function fitDreamGalleries(){'));
const elements=Object.fromEntries(['#demoBanner','#goalsCount','#content'].map(id=>[id,{}]));
let day='2026-10-29';
const goal={id:'aerobic',title:'Fazer aeróbico',target:30,days:['2026-10-28'],entries:[],plan:{...planOf({}),start:'2026-10-28'}};
const state={goals:[goal],groups:[],view:'dreams',demo:false};
const context=vm.createContext({state,planOf,complete,dayDone,today:()=>day,
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
