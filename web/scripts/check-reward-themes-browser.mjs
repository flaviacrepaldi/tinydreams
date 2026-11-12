import assert from 'node:assert/strict';
import {themeShard} from './ui-check-plan.mjs';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
const allEditions=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8'));
const shard=process.env.TINY_QA_THEME_SHARD;
const editions=themeShard(allEditions,shard,process.env.TINY_QA_THEME_SHARDS??3);
const suffix=shard===undefined?'':'-'+shard;
const directory='/tmp/tiny-reward-themes';await mkdir(directory,{recursive:true});
const failures=[],captures=[],captureMetadata={};let octoberSeal=null;
await cdp('Runtime.enable');await cdp('Page.bringToFront');await js("document.querySelector('#motionToggle').checked=true;document.querySelector('#motionToggle').dispatchEvent(new Event('change'))");const errors=[];ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
await js(`window.rewardNativeDate=Date;window.matrixReal=JSON.stringify(state.real);window.matrixWrites=[];window.matrixFetch=fetch;window.fetch=(url,options={})=>{if(options.method&&!['GET','HEAD'].includes(options.method))matrixWrites.push(String(url));return matrixFetch(url,options)};`);
async function settle(){await js(`document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))`);await js(`document.querySelectorAll('dialog[open]').forEach(d=>d.getAnimations({subtree:true}).forEach(a=>{if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish()}))`);await new Promise(r=>setTimeout(r,70))}
async function capture(path,selector){
 const clip=await js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
 assert.ok(clip.x>=0&&clip.y>=0&&clip.width>0&&clip.height>0,JSON.stringify({path,clip}));
 const modal=await js("!!document.querySelector('dialog[open]')");
 if(modal){captureMetadata[path]=await js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.left,y:r.top,width:r.width,height:r.height,viewport:innerWidth}})()`)}
 await writeFile(path,Buffer.from((await cdp('Page.captureScreenshot',modal?{format:'png'}:{format:'png',clip,captureBeyondViewport:true})).data,'base64'));captures.push(path);
}
// Every shard checks returning to October after all edition transitions.
await js(`window.Date=class extends rewardNativeDate{constructor(...args){super(...(args.length?args:[rewardNativeDate.parse('2026-10-15T12:00:00-03:00')]))}static now(){return rewardNativeDate.parse('2026-10-15T12:00:00-03:00')}};DreamThemes.reset();rewardDemo('milestone')`);
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await settle();
octoberSeal=await js("(()=>{const e=document.querySelector('.potion-sprite');return{width:parseFloat(getComputedStyle(e).width),height:parseFloat(getComputedStyle(e).height),image:getComputedStyle(e.querySelector('.last-frame')).backgroundImage}})()");
for(const edition of editions){
 await js(`resetMilestonePanel();window.Date=class extends rewardNativeDate{constructor(...args){super(...(args.length?args:[rewardNativeDate.parse('${edition.id}-15T12:00:00-03:00')]))}static now(){return rewardNativeDate.parse('${edition.id}-15T12:00:00-03:00')}};DreamThemes.reset();`);
 assert.equal(await js('DreamThemes.current.id'),edition.id);
 for(const width of [320,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
  const folder=directory+'/'+edition.id+'/'+width;await mkdir(folder,{recursive:true});
  for(const scenario of ['item','fusion','milestone','record','return','day','dream','art']){
   try{
    await js(`rewardDemo('${scenario}');`);await wait('!state.busy');
    await js(`clearTimeout(milestoneTimer);clearTimeout(itemCelebrationTimer);`);
    const panel=scenario==='item'||scenario==='fusion'?'#itemMilestone':scenario==='art'?'.writer-collection':'#milestone';
    if(scenario!=='art'){
     assert.equal(await js(`getComputedStyle(document.querySelector('${panel} .celebration-frame')).backgroundImage.includes(DreamThemes.current.celebrationAsset)`),true,'Wrong seasonal celebration');
     await js(`new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=DreamThemes.current.celebrationAsset})`);
     const activeAnimations=await js(`document.querySelector('${panel}').getAnimations({subtree:true}).length`);
     assert.ok(activeAnimations>0,'No motion in enabled celebration');
     await js(`document.querySelector('${panel}').getAnimations({subtree:true}).forEach(a=>{if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish()})`);
    }
    await settle();
    if(edition.id==='2027-07'&&scenario==='fusion'){
     const screenshot=await cdp('Page.captureScreenshot',{format:'png'});
     const cleanTop=await js(`(async()=>{const sprite=document.querySelector('#itemMilestone .potion-sprite').getBoundingClientRect(),panel=getComputedStyle(document.querySelector('#itemMilestone')),expected=panel.backgroundColor.match(/[0-9.]+/g).slice(0,3).map(Number),image=new Image();image.src='data:image/png;base64,${screenshot.data}';await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);for(let x=Math.ceil(sprite.left+20);x<sprite.right-20;x++){const pixel=ctx.getImageData(x,Math.ceil(sprite.top+1),1,1).data;if(expected.some((c,i)=>Math.abs(c-pixel[i])>3))return false}return true})()`);
     assert.ok(cleanTop,'July train must not show an atlas fragment above the illustration at '+width);
    }
    const dimensions=await js(`(()=>{const panel=document.querySelector('${panel}'),r=panel.getBoundingClientRect(),action=panel.querySelector('.milestone-copy>button'),a=action?.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:panel.scrollWidth-panel.clientWidth,action:!a||a.bottom<=r.bottom+1}})()`);
    assert.ok(dimensions.left>=-1&&dimensions.right<=width+1&&dimensions.top>=-1&&(scenario==='art'||dimensions.bottom<=845)&&dimensions.overflow<=1&&dimensions.action,JSON.stringify(dimensions));
    assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
    if(['milestone','record','return','day','dream'].includes(scenario))assert.equal(await js(`document.querySelector('.reward-badge-peek .achievement-medal').style.getPropertyValue('--badge-ink')===DreamThemes.current.tokens['--accent']`),true,'Badge uses wrong edition');
    if(['milestone','record','return','dream'].includes(scenario)){
     const contrast=await js(`(()=>{const e=document.querySelector('.practice-achievement'),s=getComputedStyle(e);const luminance=c=>{const a=c.match(/[0-9.]+/g).slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722},a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})()`);
     assert.ok(contrast>=4.5,'Seal contrast '+contrast);
    }
    if(width===390||width===320&&scenario==='milestone'||width===1280&&scenario==='dream'||edition.id==='2027-07'&&scenario==='fusion')await capture(folder+'/'+scenario+'.png',panel);
    if(edition.id==='2026-10'&&width===390&&scenario==='milestone')octoberSeal=await js("(()=>{const e=document.querySelector('.potion-sprite'),r=e.getBoundingClientRect();return{width:parseFloat(getComputedStyle(e).width),height:parseFloat(getComputedStyle(e).height),image:getComputedStyle(e.querySelector('.last-frame')).backgroundImage}})()");
   }catch(error){failures.push({edition:edition.id,width,scenario,error:error.message});console.log('FAIL '+JSON.stringify(failures.at(-1)));}
  }
  // Mixed groups cover simple/streak/list/counter/impulse/amount/one-time list/short goals.
  await js(`rewardDemo('day')`);
  await js(`(()=>{dismissMilestone(false);milestoneQueue.clear();state.groups=[{id:'matrix-a',name:'cuidados'},{id:'matrix-b',name:'rotina'}];const p={...planOf({}),kind:'habit',start:dayBefore(15),weekdays:[0,1,2,3,4,5,6],completionMode:'total',notes:'',tasks:[],items:[]};state.goals=Array.from({length:8},(_,i)=>({id:'mixed-'+i,title:['cuidar das minhas unhas','sem tiktok ao acordar com um título que ocupa duas linhas','melhorar minha alimentação','beber mais água','resistir a um impulso','somar 10K em investimentos','minha lista de livros','não aumentar minhas faturas'][i],target:i===5?10000:i===6?2:i===7?6:21,color:['sage','peach','lavender'][i%3],group_id:i<4?'matrix-a':'matrix-b',created_at:new Date().toISOString(),reward:i%2?'uma recompensa com um nome maior, para revisar o texto e a última ação do card':'',days:[dayBefore(3),dayBefore(2),dayBefore(1)],failures:[],entries:[],plan:{...p,notes:i===1?'uma observação que também pode ocupar duas linhas':'',completionMode:i===1||i===7?'streak':'total'}}));state.goals[2].plan={...p,dailyList:true,tasks:[{id:'a',title:'uma fruta',weekdays:p.weekdays},{id:'b',title:'vegetais',weekdays:p.weekdays}]};state.goals[3].plan={...p,dailyCounter:true,dailyTarget:2,unit:'quenchers'};state.goals[4].plan={...p,impulse:true,impulseStartedAt:new Date(Date.now()-3*86400000).toISOString()};state.goals[5].days=[];state.goals[5].plan={...p,kind:'amount',unit:'R$'};state.goals[5].entries=[{key:'a',day:dayBefore(3),value:4000},{key:'b',day:dayBefore(1),value:634.96}];state.goals[6].days=[];state.goals[6].plan={...p,kind:'list',items:[{id:'a',title:'um livro'},{id:'b',title:'outro livro'}]};render();document.querySelector('#demoBanner').hidden=true;document.querySelector('.mobile-chapter-link')?.click();})()`);
  await settle();
  try{
   const layout=await js(`(()=>{return [...document.querySelectorAll('.goal')].map(c=>{const r=c.getBoundingClientRect(),t=c.querySelector('h2').getBoundingClientRect(),s=c.querySelector('.dream-summary-subtitle').getBoundingClientRect(),p=c.querySelector('.dream-progress').getBoundingClientRect(),grid=c.querySelector('.streak-grid'),badge=c.querySelector('.daily-state')?.getBoundingClientRect();return{id:c.dataset.goal,height:r.height,overflow:c.scrollWidth-c.clientWidth,vertical:c.scrollHeight-c.clientHeight,title:t.top-r.top,progress:p.top-r.top,subtitle:s.top-t.bottom,headingOverlap:badge&&s.height?s.bottom-badge.top:0,future:grid?grid.querySelectorAll('[data-practice-future]').length:null,current:grid?[...grid.children].findIndex(c=>c.classList.contains('current')):null}})})()`);
   assert.ok(layout.every(x=>x.height===582&&x.overflow<=1&&x.vertical<=1&&x.subtitle>=0&&x.subtitle<=3&&x.headingOverlap<=-2+(x.headingOverlap===0?2:0)&&(x.future===null||x.future===3)&&(x.current===null||x.current===10)),JSON.stringify(layout));
   for(const field of ['title','progress'])assert.ok(Math.max(...layout.map(x=>x[field]))-Math.min(...layout.map(x=>x[field]))<2,field+' misalignment');
   for(let i=0;i<8;i++){
    if(width!==390&&i!==1&&!(width===1280&&(i===5||i===6)))continue;
    await js(`(()=>{const card=document.querySelector('[data-goal="mixed-${i}"]'),group=card.parentElement;group.prepend(card);group.scrollLeft=0;card.scrollIntoView({block:'nearest',inline:'start',behavior:'instant'})})()`);await settle();
    await capture(folder+'/card-'+i+'.png','[data-goal="mixed-'+i+'"]');
   }
  }catch(error){failures.push({edition:edition.id,width,scenario:'mixed-layout',error:error.message});console.log('FAIL '+JSON.stringify(failures.at(-1)));}
 }
 // Both accessibility paths retain static completion in every edition.
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await js(`rewardDemo('fusion')`);assert.equal(await js("getComputedStyle(document.querySelector('.fusion-day')).animationName"),'none');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await js(`document.querySelector('#motionToggle').checked=false;document.querySelector('#motionToggle').dispatchEvent(new Event('change'));rewardDemo('milestone')`);assert.equal(await js("getComputedStyle(document.querySelector('.practice-achievement')).animationName"),'none');
 await js(`document.querySelector('#motionToggle').checked=true;document.querySelector('#motionToggle').dispatchEvent(new Event('change'));`);
 console.log('CHECKED '+edition.id+' · 4 widths · 8 rewards + 8 mixed cards · reduced/paused motion');
}
// Exercise the entire transition sequence even when the full matrix is sharded.
for(const edition of allEditions){
 await js(`resetMilestonePanel();window.Date=class extends rewardNativeDate{constructor(...args){super(...(args.length?args:[rewardNativeDate.parse('${edition.id}-15T12:00:00-03:00')]))}static now(){return rewardNativeDate.parse('${edition.id}-15T12:00:00-03:00')}};DreamThemes.reset();rewardDemo('milestone');clearTimeout(milestoneTimer)`);
 assert.equal(await js('DreamThemes.current.id'),edition.id);
 await settle();
}
// A previously active world must still work after every later world was exercised.
await js(`window.Date=class extends rewardNativeDate{constructor(...args){super(...(args.length?args:[rewardNativeDate.parse('2026-10-15T12:00:00-03:00')]))}static now(){return rewardNativeDate.parse('2026-10-15T12:00:00-03:00')}};DreamThemes.reset();rewardDemo('milestone')`);
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await js("clearTimeout(milestoneTimer);document.querySelector('#milestone').getAnimations({subtree:true}).forEach(a=>{if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish()})");await settle();
assert.deepEqual(await js("(()=>{const e=document.querySelector('.potion-sprite'),r=e.getBoundingClientRect();return{width:parseFloat(getComputedStyle(e).width),height:parseFloat(getComputedStyle(e).height),image:getComputedStyle(e.querySelector('.last-frame')).backgroundImage}})()"),octoberSeal,'October must render the same when returning after later editions');
await capture(directory+'/2026-10-return'+suffix+'.png','#milestone');
assert.deepEqual(await js('matrixWrites'),[]);assert.equal(await js('JSON.stringify(state.real)===matrixReal'),true);assert.deepEqual(errors,[]);
await writeFile(directory+'/report'+suffix+'.json',JSON.stringify({editions:editions.map(e=>e.id),widths:[320,390,430,1280],captures:captures.length,failures,captureMetadata},null,2));
// Per-edition review sheets show all eight reward states and whole cards at 390px.
for(const edition of editions){
 const files=['item','fusion','milestone','record','return','day','dream','art',...Array.from({length:8},(_,i)=>'card-'+i)];
 const sources=await Promise.all(files.map(async name=>{try{return {name,data:(await readFile(directory+'/'+edition.id+'/390/'+name+'.png')).toString('base64'),clip:captureMetadata[directory+'/'+edition.id+'/390/'+name+'.png']}}catch{return null}}));
 await js(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.body.innerHTML='<main id="review"></main>';document.head.innerHTML='';document.body.style.cssText='margin:0;background:#18232c;color:white;font-family:sans-serif';document.querySelector('#review').style.cssText='display:grid;grid-template-columns:repeat(4,240px);gap:12px;padding:12px;width:1020px';for(const entry of ${JSON.stringify(sources.filter(Boolean))}){const figure=document.createElement('figure');figure.style.cssText='margin:0';const caption=document.createElement('figcaption');caption.textContent='${edition.id} · '+entry.name;caption.style.cssText='font-size:13px;padding:8px 0';const image=document.createElement('img');image.src='data:image/png;base64,'+entry.data;image.style.cssText='width:240px;height:410px;object-fit:contain;object-position:top;background:#101820';if(entry.clip){const frame=document.createElement('div'),scale=Math.min(240/entry.clip.width,410/entry.clip.height);frame.style.cssText='position:relative;width:240px;height:410px;overflow:hidden;background:#101820';image.style.cssText='position:absolute;width:'+(entry.clip.viewport*scale)+'px;height:auto;left:'+(-entry.clip.x*scale)+'px;top:'+(-entry.clip.y*scale)+'px';frame.append(image);figure.append(caption,frame)}else figure.append(caption,image);document.querySelector('#review').append(figure)}`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:1050,height:1800,deviceScaleFactor:1,mobile:false});await settle();await js("Promise.all([...document.images].map(i=>i.decode()))");
 await capture(directory+'/'+edition.id+'-review.png','#review');
}
ws.close();if(failures.length)throw Error('Theme matrix failures: '+JSON.stringify(failures));console.log('PASS: assigned themes, 4 widths, all reward/card cases and representative screenshots, motion preferences, correct artwork, future cells, layout and personal-record isolation.');
