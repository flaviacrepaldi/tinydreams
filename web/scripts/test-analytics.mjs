import assert from 'node:assert/strict';
import {analyzeHabits} from '../shared/analytics.js';
const plan={kind:'habit',start:'2026-11-01',end:'2026-11-07',weekdays:[0,1,2,3,4,5,6],tasks:[],items:[]};
const goal={id:'a',target:7,plan,days:['2026-11-01'],failures:['2026-11-02']};
const a=analyzeHabits([goal],'2026-11-08');
assert.equal(a.duration[0].total,2);
assert.equal(a.duration[0].missing,5);
assert.equal(a.duration[0].rate,50);
assert.equal(a.duration[0].goals,1);
assert.equal(a.weekdays[0].failure,1);
assert.equal(analyzeHabits([{...goal,plan:{...plan,kind:'amount'}}],'2026-11-08').habits,0);
assert.equal(analyzeHabits([{...goal,plan:{...plan,impulse:true}}],'2026-11-08').habits,0);
assert.equal(analyzeHabits([{...goal,plan:{...plan,skippedDays:['2026-11-02']}}],'2026-11-08').duration[0].failure,0);
assert.equal(analyzeHabits([goal],'2026-11-02').duration[0].total,1);
assert.equal(analyzeHabits([],'2026-11-08').duration[0].rate,null);
const missingOnly={...goal,id:'missing',days:[],failures:[]};
assert.equal(analyzeHabits([goal,missingOnly],'2026-11-08').duration[0].goals,1,'Missing-only dreams must not qualify a suggestion');
assert.equal(a.phase.reduce((sum,b)=>sum+b.total,0),2);
console.log('PASS analytics: explicit outcomes, missing days, skips, current day and incompatible types');

const {analyzeDreams}=await import('../shared/analytics.js');
const date='2026-11-08',now=Date.parse(date+'T15:00:00-03:00');
const base={id:'all',title:'Teste',target:10,days:[],failures:[],entries:[],plan:{...plan,start:'',end:''}};
const fixtures=[
 {...base,id:'habit',days:[date]},
 {...base,id:'list',plan:{...base.plan,kind:'list',items:[{id:'one'},{id:'two'}]},entries:[{key:'one',day:date,value:1},{key:'deleted',day:date,value:1}]},
 {...base,id:'amount',plan:{...base.plan,kind:'amount',unit:'reais'},entries:[{day:date,key:'a',value:2.5},{day:date,key:'b',value:1.25},{day:'2026-11-09',key:'future',value:90}]},
 {...base,id:'quantity',plan:{...base.plan,dailyTarget:2,unit:'litros'},entries:[{day:date,key:'a',value:0.5}]},
 {...base,id:'daily-list',plan:{...base.plan,dailyList:true,tasks:[{id:'a',weekdays:plan.weekdays},{id:'b',weekdays:plan.weekdays}]},entries:[{day:date,key:date+':a',value:1}]},
 {...base,id:'counter',plan:{...base.plan,dailyCounter:true,dailyTarget:3,unit:'vezes'},entries:[{day:date,key:'a',value:1}]},
 {...base,id:'impulse',plan:{...base.plan,impulse:true,impulseStartedAt:'2026-11-06T15:00:00-03:00'},entries:[{day:date,key:'urge:a',value:1}]}
];
const original=JSON.stringify(fixtures),all=analyzeDreams(fixtures,date,now);
assert.equal(all.total,7);
assert.equal(all.dreams[0].value,1,'Today contributes to the panorama');
assert.equal(all.dreams[1].value,1,'Deleted list items must not count');
assert.equal(all.dreams[1].target,2);
assert.equal(all.dreams[2].value,3.75,'Amounts retain decimals and exclude future entries');
assert.equal(all.dreams[2].unit,'reais');
assert.equal(all.dreams[3].value,0,'Partial quantities are not completed days');
assert.match(all.dreams[3].detail,/0,5 litros/);
assert.equal(all.dreams[4].value,0,'Partial lists are not completed days');
assert.equal(all.dreams[5].type,'contador diário');
assert.equal(all.dreams[6].value,48,'Impulse timer uses elapsed hours, not daily check-ins');
assert.equal(all.activity.at(-1).dreams,7,'Multiple entries count as one dream-day');
assert.equal(all.activity.slice(0,-1).reduce((n,a)=>n+a.dreams,0),0);
assert.equal(JSON.stringify(fixtures),original,'Analysis is read-only');
assert.deepEqual(analyzeDreams(fixtures,date,now),all,'Identical inputs produce identical results');
const reset=analyzeDreams([{...fixtures[6],failures:[date],plan:{...fixtures[6].plan,impulseResets:{[date]:date+'T12:00:00-03:00'}}}],date,now);
assert.equal(reset.dreams[0].value,3);
const finished=analyzeDreams([{...base,target:1,days:[date,date]}],date,now);
assert.equal(finished.completed,1);assert.equal(finished.dreams[0].value,1,'Deduplicate practice dates');
const streak=analyzeDreams([{...base,days:['2026-11-01'],plan:{...base.plan,completionMode:'streak'}}],date,now);
assert.equal(streak.dreams[0].value,0,'Broken sequences reflect current progress');
assert.equal(analyzeDreams([],date,now).total,0);
console.log('PASS all-type analytics: units, today, partial entries, deduplication, resets, future exclusion and repeatability');
