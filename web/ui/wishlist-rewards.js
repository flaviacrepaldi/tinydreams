// The editor stages a choice; only saving the dream changes its reward.
let wishRewardConfig=null,wishRewardChoice='none',wishRewardPrevious=null,wishRewardOptions=[],wishRewardBusy=false,wishRewardToken=0,wishRewardTouched=false,wishRewardEmpty=false,wishRewardBudget='any',wishRewardTarget='goal';
function wishlistRewardRoot(){return $(wishRewardTarget==='group'?'#groupWishlistRewardEditor':'#wishlistRewardEditor')}
function wishlistRewardHidden(){return $(wishRewardTarget==='group'?'#groupReward':'#goalReward')}
function setupWishlistReward(g,target='goal'){
 wishRewardTarget=target;const other=$(target==='group'?'#wishlistRewardEditor':'#groupWishlistRewardEditor');if(other)other.innerHTML='';
 const saved=target==='group'?g?.rewardConfig:g?.plan?.wishlistReward;wishRewardBudget=saved?.budget||'any';
 ++wishRewardToken;wishRewardBusy=false;wishRewardEmpty=false;wishRewardTouched=!!saved;
 wishRewardConfig=saved?structuredClone(saved):null;
 wishRewardChoice=wishRewardConfig?.mode||(g?.reward?'legacy':'none');wishRewardPrevious=null;wishRewardOptions=[];
 renderWishlistReward();if(wishRewardConfig&&wishRewardChoice!=='none')loadRewardWishlist(false);
}
function rewardChoiceOptions(){return `${wishRewardChoice==='legacy'?'<option value="legacy">manter recompensa atual</option>':''}<option value="none">sem recompensa</option><option value="random-now">sortear um item agora</option><option value="random-complete">sortear quando o ${wishRewardTarget==='group'?'big dream':'tydream'} for realizado</option><option value="manual">selecionar um item da wishlist</option><option value="new">criar um item na wishlist</option>`}
function renderWishlistReward(message='',error=false){
 const root=wishlistRewardRoot();if(!root)return;
 const empty=['manual','random-now','random-complete'].includes(wishRewardChoice)&&!wishRewardBusy&&wishRewardEmpty;
 const create=wishRewardChoice==='new';
 root.innerHTML=`<label for="wishRewardMode">recompensa</label><select id="wishRewardMode" ${wishRewardBusy?'disabled':''}>${rewardChoiceOptions()}</select>${['random-now','random-complete'].includes(wishRewardChoice)?`<label for="wishRewardBudget">limite de valor para o sorteio (opcional)</label><select id="wishRewardBudget" ${wishRewardBusy||wishRewardChoice==='random-complete'&&wishRewardConfig?.itemId?'disabled':''}><option value="any">sem limite · qualquer item</option><option value="small">até barato · até R$ 50</option><option value="medium">até valor mediano · até R$ 200</option><option value="high">até carinho · até R$ 500</option></select><p class="form-hint">sem limite inclui itens sem valor ou classificação. com limite, entram apenas itens classificados dentro da faixa.</p>`:''}${wishRewardChoice==='legacy'?`<p class="form-hint" data-user-content>${esc(wishlistRewardHidden().value)}</p>`:''}${wishRewardChoice==='manual'&&wishRewardOptions.length?`<label for="wishRewardItem">item da wishlist</label><select id="wishRewardItem"><option value="">selecionar um item</option>${wishRewardOptions.map(w=>`<option value="${esc(w.id)}" ${wishRewardConfig?.itemId===w.id?'selected':''} data-user-content>${esc(w.title)}</option>`).join('')}</select>`:''}${wishRewardChoice==='random-now'?'<button type="button" class="secondary" data-reward-wish="draw">sortear agora</button>':''}${wishRewardConfig?.itemId&&['manual','random-now','random-complete'].includes(wishRewardChoice)?`<p class="reward-wish-picked" data-user-content>${icon('gift')}${esc(wishRewardConfig.title||wishlistRewardHidden().value)}</p>`:''}${wishRewardChoice==='random-complete'?`<p class="form-hint">${wishRewardConfig?.itemId?'este item já foi sorteado na realização e continuará guardado.':`um item será sorteado entre os desejos ainda não realizados quando ${wishRewardTarget==='group'?'todos os tydreams deste big dream estiverem realizados':'este tydream atingir a meta'}.`}</p>`:''}${empty?'<div class="reward-wish-empty"><p>não há itens disponíveis na wishlist para este sorteio ou seleção. crie um item ou cancele.</p><button type="button" class="secondary" data-reward-wish="new">criar um item</button><button type="button" class="text-button" data-reward-wish="cancel">cancelar</button></div>':''}${create?`<div class="reward-wish-create"><label for="rewardWishTitle">novo item</label><input id="rewardWishTitle" maxlength="160" placeholder="o que você deseja?"><label for="rewardWishNotes">observação (opcional)</label><textarea id="rewardWishNotes" maxlength="2000" rows="2"></textarea>${wishlistPriceFields({},'rewardWish')}<label for="rewardWishLink">link (opcional)</label><input id="rewardWishLink" type="url" inputmode="url" maxlength="2000" placeholder="https://"><div class="wish-form-actions"><button type="button" class="secondary" data-reward-wish="create">criar e usar como recompensa</button><button type="button" class="text-button" data-reward-wish="cancel">cancelar</button></div></div>`:''}<p id="wishRewardMessage" class="${error?'form-error':'form-hint'}" role="${error?'alert':'status'}">${wishRewardBusy?'abrindo wishlist…':esc(message)}</p>`;
 $('#wishRewardMode').value=wishRewardChoice;if($('#wishRewardBudget'))$('#wishRewardBudget').value=wishRewardBudget;
 root.querySelectorAll('button').forEach(b=>b.disabled=wishRewardBusy);
}
function useWishlistReward(item,mode=wishRewardChoice){
 wishRewardChoice=mode;wishRewardTouched=true;wishRewardConfig={mode,budget:wishRewardBudget,itemId:item.id,title:item.title,link:item.link||''};wishlistRewardHidden().value=item.title;renderWishlistReward();
}
async function loadRewardWishlist(draw=false){
 const token=++wishRewardToken;wishRewardBusy=true;renderWishlistReward();
 try{
  const items=state.demo?wishlistDemo:await api('/wishlist');if(token!==wishRewardToken)return;
  wishRewardOptions=eligibleWishlist(items,['random-now','random-complete'].includes(wishRewardChoice)?wishRewardBudget:'any');wishRewardEmpty=!wishRewardOptions.length;wishRewardBusy=false;
  if(draw&&wishRewardOptions.length){const options=wishRewardOptions.filter(w=>w.id!==wishRewardConfig?.itemId),pool=options.length?options:wishRewardOptions;useWishlistReward(pool[crypto.getRandomValues(new Uint32Array(1))[0]%pool.length],'random-now')}
  else renderWishlistReward();
 }catch(error){if(token!==wishRewardToken)return;wishRewardBusy=false;renderWishlistReward(error.message,true)}
}
function wishlistRewardFormData(validate=false){
 if(validate&&wishRewardBusy)throw Error('Aguarde a wishlist terminar de carregar.');
 if(validate&&wishRewardEmpty&&!wishRewardConfig?.itemId&&wishRewardChoice!=='none'&&wishRewardChoice!=='legacy'&&wishRewardChoice!=='new')throw Error('Não há itens na wishlist. Crie um item ou cancele.');
 if(validate&&wishRewardChoice==='new')throw Error('Crie o item da wishlist ou cancele a criação antes de salvar.');
 if(validate&&['manual','random-now'].includes(wishRewardChoice)&&!wishRewardConfig?.itemId)throw Error('Não há item selecionado. Crie um item, selecione, sorteie ou cancele.');
 if(!wishRewardTouched||wishRewardChoice==='legacy')return {};
 return {wishlistReward:wishRewardConfig||{mode:'none'}};
}
document.addEventListener('change',event=>{
 if(event.target.id==='wishRewardBudget'){
  wishRewardBudget=event.target.value;wishRewardTouched=true;
  if(wishRewardChoice==='random-now'){wishRewardConfig=null;wishlistRewardHidden().value=''}
  else wishRewardConfig={mode:'random-complete',budget:wishRewardBudget};
  loadRewardWishlist(wishRewardChoice==='random-now');return;
 }
 if(event.target.id==='wishRewardMode'){
  wishRewardPrevious={choice:wishRewardChoice,config:wishRewardConfig?structuredClone(wishRewardConfig):null,reward:wishlistRewardHidden().value,touched:wishRewardTouched};
  wishRewardChoice=event.target.value;wishRewardTouched=true;wishRewardConfig=wishRewardChoice==='none'?{mode:'none'}:wishRewardChoice==='random-complete'?{mode:'random-complete',budget:wishRewardBudget}:null;
  if(wishRewardChoice!=='legacy')wishlistRewardHidden().value=wishRewardChoice==='random-complete'?'surpresa da wishlist ao realizar':'';
  renderWishlistReward();if(['manual','random-now','random-complete'].includes(wishRewardChoice))loadRewardWishlist(wishRewardChoice==='random-now');
 }
 if(event.target.id==='wishRewardItem'){const item=wishRewardOptions.find(w=>w.id===event.target.value);if(item)useWishlistReward(item,'manual');else{wishRewardConfig=null;wishlistRewardHidden().value=''}}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-reward-wish]');if(!button||wishRewardBusy)return;
 const action=button.dataset.rewardWish;
 if(action==='draw'){wishRewardPrevious={choice:wishRewardChoice,config:wishRewardConfig?structuredClone(wishRewardConfig):null,reward:wishlistRewardHidden().value,touched:wishRewardTouched};await loadRewardWishlist(true);return}
 if(action==='new'){wishRewardChoice='new';renderWishlistReward();return}
 if(action==='cancel'){
  ++wishRewardToken;wishRewardEmpty=false;const prev=wishRewardPrevious;wishRewardChoice=prev?.choice||'none';wishRewardConfig=prev?.config||null;wishRewardTouched=prev?.touched||false;wishlistRewardHidden().value=prev?.reward||'';wishRewardBudget=prev?.config?.budget||'any';wishRewardPrevious=null;renderWishlistReward();return;
 }
 if(action==='create'){
  const title=$('#rewardWishTitle').value.trim(),notes=$('#rewardWishNotes').value.trim(),link=$('#rewardWishLink').value.trim();
  const fail=message=>{const el=$('#wishRewardMessage');el.className='form-error';el.setAttribute('role','alert');el.textContent=message};
  if(!title){fail('escreva o nome do item.');return}
  if(link){try{const u=new URL(link);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error()}catch{fail('informe um link começando com https:// ou http://.');return}}
  wishRewardBusy=true;wishlistRewardRoot().querySelectorAll('button,select,input,textarea').forEach(el=>el.disabled=true);
  try{const item=await changeWish('POST',null,{title,notes,link,...wishlistPriceValues('rewardWish')});wishlistMode=null;wishRewardOptions=[item,...wishRewardOptions];wishRewardEmpty=false;wishRewardBusy=false;useWishlistReward(item,'manual');toast('item criado na wishlist e escolhido como recompensa.')}catch(error){wishRewardBusy=false;wishlistRewardRoot().querySelectorAll('button,select,input,textarea').forEach(el=>el.disabled=false);fail(error.message)}
 }
});
function resolveDemoWishlistRewards(){
 if(!state.demo)return;
 for(const g of state.goals){const r=g.plan?.wishlistReward;if(r?.mode!=='random-complete'||r.itemId||!complete(g))continue;
  const pool=eligibleWishlist(wishlistDemo,r.budget||'any');
  if(!pool.length){g.reward='nenhum item disponível para este sorteio';continue}
  const item=pool[crypto.getRandomValues(new Uint32Array(1))[0]%pool.length];g.plan.wishlistReward={...r,itemId:item.id,title:item.title,link:item.link||''};g.reward=item.title;
 }
 for(const group of state.groups){const r=group.rewardConfig,members=state.goals.filter(g=>g.group_id===group.id);if(r?.mode!=='random-complete'||r.itemId||!members.length||!members.every(complete))continue;const pool=eligibleWishlist(wishlistDemo,r.budget||'any');if(!pool.length){group.reward='nenhum item disponível para este sorteio';continue}const item=pool[crypto.getRandomValues(new Uint32Array(1))[0]%pool.length];group.rewardConfig={...r,itemId:item.id,title:item.title,link:item.link||''};group.reward=item.title}
}

document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.closest('.reward-wish-create')&&event.target.tagName!=='TEXTAREA'){event.preventDefault();document.querySelector('[data-reward-wish=create]')?.click()}});
