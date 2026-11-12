import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=(process.env.TINY_QA_URL||'http://localhost:4177').replace('127.0.0.1','localhost'),debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+15000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,75))}throw Error('Timed out: '+expression+' · '+await js('document.querySelector("#wishlistError")?.textContent||document.querySelector("#content")?.textContent'))}
const click=selector=>js(`document.querySelector(${JSON.stringify(selector)}).click()`);
const shot=async name=>{await js('document.fonts.ready;new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await writeFile('/tmp/wishlist-'+name+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))};
try{
 await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy&&typeof renderWishlist==='function'");
 await js(`(()=>{const probe=document.createElement('div');probe.id='currencyQA';probe.innerHTML='<p>de r$ 10 a R$ 20</p><p data-user-content>Meu Texto r$ 40</p><input placeholder="Valor em R$" value="r$ digitado">';document.body.append(probe)})()`);
 await wait('document.querySelector("#currencyQA p").textContent==="de R$ 10 a R$ 20"');
 assert.equal(await js('document.querySelector("#currencyQA [data-user-content]").textContent'),'Meu Texto R$ 40');
 assert.equal(await js('document.querySelector("#currencyQA input").value'),'r$ digitado','Formatting must not change entered values');
 assert.equal(await js('document.querySelector("#currencyQA input").placeholder'),'valor em R$');
 await js('document.querySelector("#currencyQA").remove()');
 assert.deepEqual(await js("[...document.querySelectorAll('.tabs [data-view]')].map(b=>b.dataset.view)"),['dreams','shelf','wishlist','analytics','calendar'],'Calendar follows analytics');
 await click('[data-view=wishlist]');await wait('!!document.querySelector(".wish-empty")');
 await shot('empty');
 await click('[data-wish=new]');
 await js(`document.querySelector('#wishTitle').value='Conhecer o MAR e viver uma experiência com um título bem longo';document.querySelector('#wishNotes').value='Uma viagem sem pressa.\\nGuardar o nome EXATO e lembrar de planejar com carinho.';document.querySelector('#wishLink').value='https://example.com/viagem';document.querySelector('#wishlistForm').requestSubmit()`);
 await wait('!!document.querySelector(".wish-item")');
 const id=await js('wishlistItems[0].id');
 assert.equal(await js('document.querySelector(".wish-copy h3").textContent'),'Conhecer o MAR e viver uma experiência com um título bem longo');
 assert.equal(await js('document.querySelector(".wish-link").getAttribute("href")'),'https://example.com/viagem');
 await cdp('Page.reload');await wait("typeof state!=='undefined'&&!state.busy&&typeof renderWishlist==='function'");await click('[data-view=wishlist]');await wait('!!document.querySelector(".wish-item")');
 assert.equal(await js('wishlistItems[0].id'),id,'Wish must persist across reload');
 for(const width of [320,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
  await js("document.documentElement.style.setProperty('--bottom-safe-area','34px');document.documentElement.style.setProperty('--top-safe-area','47px')");
  await shot(width);
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Page overflow '+width);
  const nav=await js("[...document.querySelectorAll('.tabs .tab')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})");
  const actions=await js("[...document.querySelectorAll('.wish-actions button')].map(b=>{const r=b.getBoundingClientRect();return {icon:!!b.querySelector('svg'),label:b.getAttribute('aria-label'),text:b.textContent.trim(),width:r.width,height:r.height}})");
  assert.ok(actions.every(b=>b.icon&&b.label&&b.text===''&&b.width>=44&&b.height>=44),'Icon-only wishlist actions retain names and 44px targets '+width);
  if(width<600){
   const compact=await js("(()=>{const row=document.querySelector('.wish-item'),title=row.querySelector('h3'),link=row.querySelector('.wish-mobile-link');return {height:row.getBoundingClientRect().height,title:parseFloat(getComputedStyle(title).fontSize),link:!!link&&getComputedStyle(link).display!=='none',scroll:row.scrollHeight-row.clientHeight}})()");
   assert.ok(compact.height<=205&&compact.title===16&&compact.link&&compact.scroll<=1,'Long wishlist item stays compact without hiding content '+JSON.stringify({width,...compact}));
  }
  const controls=await js("[...document.querySelectorAll('.wish-actions button,.wish-heading button,.wish-filters button,.tabs .tab')].map(b=>{const s=getComputedStyle(b);return {background:s.backgroundColor,radius:parseFloat(s.borderRadius),border:parseFloat(s.borderTopWidth),outline:s.outlineStyle}})");
  assert.ok(controls.every(b=>b.background==='rgba(0, 0, 0, 0)'&&b.radius>=20&&(b.border>=1||b.outline==='solid')),'Shared transparent rounded outlines '+JSON.stringify({width,controls}));
  assert.equal(nav.length,5);assert.ok(nav.every(n=>n.width>=44&&n.left>=0&&n.right<=width+1),'Navigation does not fit '+width);
  assert.equal(await js("getComputedStyle(document.querySelector('.welcome')).display"),'none');
 }
 await click('[data-wish=edit]');await js("document.querySelector('#wishNotes').value='Minha observação EDITADA';document.querySelector('#wishlistForm').requestSubmit()");await wait('!document.querySelector("#wishlistForm")');
 await click('[data-wish=toggle]');await wait('wishlistItems[0].completed===1');await click('[data-wish-filter=done]');await wait('!!document.querySelector(".wish-item")');await shot('done');
 await click('[data-wish=toggle]');await wait('wishlistItems[0].completed===0');await click('[data-wish-filter=pending]');await wait('!!document.querySelector(".wish-item")');
 // Failed saves must retain the form and all entered values.
 await click('[data-wish=edit]');await js("window.wishNativeFetch=fetch;window.fetch=(url,options)=>String(url).includes('/wishlist')&&options?.method==='PATCH'?Promise.resolve(new Response(JSON.stringify({error:'falha simulada'}),{status:400})):wishNativeFetch(url,options);document.querySelector('#wishTitle').value='Manter meu rascunho';document.querySelector('#wishlistForm').requestSubmit()");await wait('document.querySelector("#wishlistError")?.textContent.includes("falha simulada")');assert.equal(await js('document.querySelector("#wishTitle").value'),'Manter meu rascunho');await js('window.fetch=wishNativeFetch');await click('[data-wish=cancel]');
 await click('[data-wish=delete]');assert.equal(await js('wishlistItems.length'),1);await click('[data-wish=confirm-delete]');await wait('wishlistItems.length===0');
 await js("showDemo();state.view='wishlist';render()");await wait('!!document.querySelector(".wish-empty")');await click('[data-wish=new]');await js("document.querySelector('#wishTitle').value='Desejo de demonstração';document.querySelector('#wishlistForm').requestSubmit()");await wait('wishlistDemo.length===1');
 assert.deepEqual(await js("api('/wishlist')"),[],'Demo must never persist wishes');
 await js("state.demo=false;state.view='wishlist';render()");await wait('!!document.querySelector(".wish-empty")');
 await js("DreamThemes.preview('2027-04')");await shot('light');await js('DreamThemes.reset()');
 // Reward choices use real records in this temporary QA database only.
 await js('(async()=>{await load()})()');
 const gid=await js(`(async()=>{const g=await api('','POST',{title:'Um tydream com recompensa',reward:'',target:1,color:'sage',plan:{kind:'habit',weekdays:[0,1,2,3,4,5,6],tasks:[],items:[],notes:'',unit:'',start:'',end:''}});state.goals.push(g);state.real=state.goals;openForm(g.id);document.querySelector('#goalExtras').open=true;return g.id})()`);
 const choose=async value=>{await js(`document.querySelector('#wishRewardMode').value=${JSON.stringify(value)};document.querySelector('#wishRewardMode').dispatchEvent(new Event('change',{bubbles:true}))`);await wait('!wishRewardBusy')};
 await choose('manual');assert.equal(await js('!!document.querySelector(".reward-wish-empty")'),true);
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await js("document.querySelector('#wishlistRewardEditor').scrollIntoView({block:'start'})");await shot('reward-empty');
 await click('[data-reward-wish=new]');await js("document.querySelector('#rewardWishTitle').value='Um passeio ESPECIAL';document.querySelector('#rewardWishNotes').value='Uma experiência';document.querySelector('#rewardWishLink').value='https://example.com/passeio';document.querySelector('#rewardWishAmount').value='35';document.querySelector('#rewardWishAmount').dispatchEvent(new Event('input',{bubbles:true}))");
 await shot('reward-create');await click('[data-reward-wish=create]');await wait('!wishRewardBusy&&wishRewardConfig?.itemId');
 const firstWish=await js('wishRewardConfig.itemId');
 await js("document.querySelector('#goalForm').requestSubmit()");await wait('!document.querySelector("#goalDialog").open');
 assert.equal(await js(`state.goals.find(g=>g.id===${JSON.stringify(gid)}).plan.wishlistReward.mode`),'manual');
 const otherWish=await js("(async()=>{await api('/wishlist','POST',{title:'Uma viagem cara',amount:650});return (await api('/wishlist','POST',{title:'Outro passeio',valueClass:'small'})).id})()");
 await js('wishlistMode=null;renderWishlist()');await wait('!!document.querySelector(".wish-value")');
 for(const width of [320,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js('scrollTo(0,0)');await shot('prices-'+width);if(width<600){const sizes=await js("[...document.querySelectorAll('.wish-item')].map(e=>e.getBoundingClientRect().height)");assert.ok(sizes.every(h=>h<=155),'Ordinary wishlist rows stay compact '+JSON.stringify({width,sizes}))}assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Price labels overflow '+width);
  if(width<600){await js('scrollTo(0,document.documentElement.scrollHeight)');await js('new Promise(r=>requestAnimationFrame(r))');const fits=await js("(()=>{const actions=[...document.querySelectorAll('.wish-actions')],r=actions.at(-1).getBoundingClientRect(),nav=document.querySelector('.tabs').getBoundingClientRect();return r.bottom<=nav.top})()");assert.equal(fits,true,'Last wish actions must scroll above bottom navigation '+width);await shot('prices-bottom-'+width)}
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await click('[data-wish=new]');await js("document.querySelector('#wishTitle').value='Uma ideia para depois';document.querySelector('#wishAmount').value='245';document.querySelector('#wishAmount').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#wishAmount').scrollIntoView({block:'center'})");await shot('price-form');assert.equal(await js('document.querySelector("#wishValueClass").value'),'high');assert.equal(await js('document.querySelector(".wishlist-panel").textContent.includes("r$")'),false,'All visible currency labels use uppercase R$');await click('[data-wish=cancel]');
 await js(`openForm(${JSON.stringify(gid)});document.querySelector('#goalExtras').open=true`);await wait('!wishRewardBusy');
 await choose('random-now');await js("document.querySelector('#wishRewardBudget').value='small';document.querySelector('#wishRewardBudget').dispatchEvent(new Event('change',{bubbles:true}))");await wait('!wishRewardBusy&&wishRewardConfig?.itemId');
 assert.ok([firstWish,otherWish].includes(await js('wishRewardConfig.itemId')));
 const beforeDraw=await js('wishRewardConfig.itemId');await click('[data-reward-wish=draw]');await wait('!wishRewardBusy');assert.notEqual(await js('wishRewardConfig.itemId'),beforeDraw,'Explicit reroll chooses another eligible item when possible');
 for(const width of [320,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js("document.querySelector('#wishlistRewardEditor').scrollIntoView({block:'start'})");await shot('reward-'+width);assert.equal(await js('document.querySelector("#goalDialog").scrollWidth>document.querySelector("#goalDialog").clientWidth'),false,'Reward form overflow '+width);
 }
 await choose('random-complete');await js("document.querySelector('#goalForm').requestSubmit()");await wait('!document.querySelector("#goalDialog").open');
 assert.equal(await js(`state.goals.find(g=>g.id===${JSON.stringify(gid)}).plan.wishlistReward.itemId`),undefined);
 await js(`(async()=>{await changeDay(${JSON.stringify(gid)},today());resetMilestonePanel()})()`);
 const earned=await js(`state.goals.find(g=>g.id===${JSON.stringify(gid)}).plan.wishlistReward.itemId`);assert.ok([firstWish,otherWish].includes(earned));
 await js(`openForm(${JSON.stringify(gid)});document.querySelector('#goalExtras').open=true`);await wait('!wishRewardBusy');assert.equal(await js('wishRewardConfig.itemId'),earned,'Reopening does not reroll a completion reward');await click('[data-close=goalDialog]');
 await js('openGroup()');await js("document.querySelector('#groupName').value='Meu Big Dream com recompensa'");await choose('random-complete');await js("document.querySelector('#wishRewardBudget').value='medium';document.querySelector('#wishRewardBudget').dispatchEvent(new Event('change',{bubbles:true}))");await wait('!wishRewardBusy');await js("document.querySelector('#groupWishlistRewardEditor').scrollIntoView({block:'start'})");await shot('group-reward');await js("document.querySelector('#groupForm').requestSubmit()");await wait('!document.querySelector("#groupDialog").open');
 const groupId=await js('state.groups.at(-1).id');assert.equal(await js('state.groups.at(-1).rewardConfig.budget'),'medium');
 await js(`openGroup(${JSON.stringify(groupId)})`);await wait('!wishRewardBusy');await choose('manual');await js(`document.querySelector('#wishRewardItem').value=${JSON.stringify(firstWish)};document.querySelector('#wishRewardItem').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#groupForm').requestSubmit()`);await wait('!document.querySelector("#groupDialog").open');assert.equal(await js('state.groups.at(-1).rewardConfig.itemId'),firstWish);
 await js(`(async()=>{await api('/groups/'+${JSON.stringify(groupId)},'DELETE');await api('/'+${JSON.stringify(gid)},'DELETE');for(const w of await api('/wishlist'))await api('/wishlist/'+w.id,'DELETE')})()`);
 console.log('PASS: wishlist create/reload/edit/delete, completion/undo, optional links, preserved casing, failed-save drafts, demo isolation, five-item navigation, safe areas, light theme, price-aware reward choices, empty-list create/cancel, immediate reroll, stable completion draw, Big Dream configuration and 320/390/430/1280px screenshots.');
}finally{await cdp('Page.close');ws.close()}
