import assert from 'node:assert/strict';
import {analyzeHabits,analyzeTimeline} from '../shared/analytics.js';
const plan={kind:'habit',start:'2026-11-01',end:'2026-11-07',weekdays:[0,1,2,3,4,5,6],tasks:[],items:[]};
const goal={id:'a',title:'Teste',target:7,plan,days:['2026-11-01'],failures:['2026-11-02'],entries:[]};
const a=analyzeHabits([goal],'2026-11-08');
assert.equal(a.duration[0].total,2);assert.equal(a.duration[0].missing,5);assert.equal(a.duration[0].rate,50);assert.equal(a.duration[0].goals,1);assert.equal(a.weekdays[0].failure,1);
assert.equal(analyzeHabits([{...goal,plan:{...plan,kind:'amount'}}],'2026-11-08').habits,0);
assert.equal(analyzeHabits([{...goal,plan:{...plan,impulse:true}}],'2026-11-08').habits,0);
assert.equal(analyzeHabits([{...goal,plan:{...plan,skippedDays:['2026-11-02']}}],'2026-11-08').duration[0].failure,0);
assert.equal(analyzeHabits([goal],'2026-11-02').duration[0].total,1);
assert.equal(analyzeHabits([],'2026-11-08').duration[0].rate,null);
assert.equal(analyzeHabits([goal,{...goal,id:'missing',days:[],failures:[]}],'2026-11-08').duration[0].goals,1);
assert.equal(a.phase.reduce((sum,b)=>sum+b.total,0),2);
const date='2026-11-09';
// Reproduces the reported daily-list history without copying personal data.
const list={...goal,target:21,plan:{...plan,start:'2026-10-27',end:'',dailyList:true,tasks:[{id:'a',weekdays:plan.weekdays},{id:'b',weekdays:plan.weekdays}]},days:['2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],failures:[],entries:['2026-11-01','2026-11-07','2026-11-08',date].map(day=>({day,key:day+':a',value:1}))};
const before=JSON.stringify(list),timeline=analyzeTimeline([list],date);
assert.deepEqual(timeline.rows[0].counts,{success:9,failure:0,partial:3,missing:1});
assert.equal(timeline.rows[0].cells.at(-1).status,'partial','Today remains in progress, outside closed-day counts');
const rates=analyzeHabits([list],date,{since:timeline.days[0],includeToday:true});
assert.deepEqual({success:rates.duration[1].success,failure:rates.duration[1].failure,partial:rates.duration[1].partial,missing:rates.duration[1].missing},{success:9,failure:0,partial:3,missing:1});
assert.equal(rates.duration[1].total,9,'Incomplete and missing days never inflate explicit-result denominator');
assert.equal(JSON.stringify(list),before);
assert.deepEqual(analyzeTimeline([list],date),timeline,'Reports are repeatable');
const edited={...goal,plan:{...plan,weekdays:[6]}};
assert.equal(analyzeHabits([edited],'2026-11-08').duration[0].failure,1,'Schedule edits must not erase saved failures');
assert.equal(analyzeHabits([goal],'2026-11-02',{includeToday:true}).duration[0].total,2,'Explicit results today are visible');
const base={...goal,id:'base',days:[],failures:[],entries:[],plan:{...plan,start:'2026-11-01',end:''}};
const fixtures=[list,
 {...base,id:'amount',plan:{...base.plan,kind:'amount',unit:'reais'},entries:[{day:date,key:'a',value:2.5},{day:date,key:'b',value:1.25},{day:'2026-11-10',key:'future',value:90}]},
 {...base,id:'one-time-list',plan:{...base.plan,kind:'list',items:[{id:'a'}]},entries:[{day:date,key:'a',value:1},{day:date,key:'deleted',value:1}]},
 {...base,id:'impulse',plan:{...base.plan,impulse:true},failures:['2026-11-08'],entries:[{day:date,key:'urge:a',value:1}]},
 {...base,id:'quantity',plan:{...base.plan,dailyTarget:2,unit:'litros'},entries:[{day:'2026-11-08',key:'a',value:0.5}]},
 {...base,id:'counter',plan:{...base.plan,dailyCounter:true,dailyTarget:3,unit:'vezes'},entries:[{day:date,key:'a',value:1}]}
];
const all=analyzeTimeline(fixtures,date);
assert.equal(all.rows.length,6);assert.equal(all.days.length,28);
assert.equal(all.rows[1].cells.at(-1).value,3.75,'Amounts preserve decimals and exclude future entries');
assert.equal(all.rows[2].cells.at(-1).value,1,'Only existing list items count');
assert.equal(all.rows[3].cells.at(-2).status,'failure');
assert.ok(all.rows[3].cells.every(c=>c.status!=='missing'),'Timers do not require daily check-ins');
assert.equal(all.rows[4].cells.at(-2).status,'partial');
assert.equal(all.activity.at(-1).total,5,'Multiple entries count as a single dream-day');
assert.equal(all.rows[5].type,'contador diário');
assert.equal(analyzeTimeline([{...base,days:[date,date]}],date).activity.at(-1).success,1);
assert.equal(analyzeTimeline([],date).activity.at(-1).total,0);
assert.equal(analyzeHabits([list],date,{since:'2026-11-07'}).duration[1].partial,2,'Period filters apply to incomplete days too');
console.log('PASS analytics: daily-list incomplete/missing regression, explicit failures, current day, windows, units, deduplication, schedule edits, repeatability and read-only inputs');
