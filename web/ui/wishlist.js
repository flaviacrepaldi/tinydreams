// Wishes are independent of practice goals; demo changes never reach the API.
let wishlistDemo=[],wishlistItems=[],wishlistMode=null,wishlistFilter='pending',wishlistEditing=null,wishlistFormOpen=false,wishlistDeleting=null,wishlistBusy=false,wishlistLoad=0,wishlistDraft=null;
const wishlistDescription='ideias, lugares e experiências que você quer viver.';
const wishValueLabels={small:'barato · até R$ 50',medium:'valor mediano · de R$ 50,01 a R$ 200',high:'carinho · de R$ 200,01 a R$ 500',large:'preciso me organizar · acima de R$ 500'};
function wishlistPriceFields(item={},prefix='wish'){
 return `<div class="wish-value-fields"><label for="${prefix}Amount">valor aproximado em R$ (opcional)</label><input id="${prefix}Amount" name="amount" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" value="${item.amount??''}" placeholder="0,00"><label for="${prefix}ValueClass">classificação de valor (opcional)</label><select id="${prefix}ValueClass" name="valueClass" ${item.amount!=null?'disabled':''}><option value="">sem classificação</option>${Object.entries(wishValueLabels).map(([value,label])=>`<option value="${value}" ${wishlistValueClass(item)===value?'selected':''}>${label}</option>`).join('')}</select><p class="form-hint">com valor preenchido, a classificação é automática.</p></div>`;
}
function wishlistPriceValues(prefix='wish'){
 const value=$('#'+prefix+'Amount').value;return {amount:value===''?null:Number(value.replace(',','.')),valueClass:$('#'+prefix+'ValueClass').value};
}
document.addEventListener('input',event=>{
 for(const prefix of ['wish','rewardWish'])if(event.target.id===prefix+'Amount'){
  const select=$('#'+prefix+'ValueClass'),amount=event.target.value;select.disabled=amount!=='';if(amount!=='')select.value=wishlistValueClass({amount:Number(amount)});
 }
});
function wishlistForm(){
 const item=wishlistDraft||wishlistItems.find(w=>w.id===wishlistEditing)||{};
 return `<form id="wishlistForm" class="wish-form"><h3>${wishlistEditing?'editar desejo':'novo desejo'}</h3><label for="wishTitle">o que você deseja?</label><input id="wishTitle" name="title" maxlength="160" required value="${esc(item.title||'')}" placeholder="um desejo do seu jeito"><label for="wishNotes">observação <span>(opcional)</span></label><textarea id="wishNotes" name="notes" maxlength="2000" rows="3" placeholder="o que você quer lembrar?">${esc(item.notes||'')}</textarea><label for="wishLink">link <span>(opcional)</span></label><input id="wishLink" name="link" type="url" inputmode="url" maxlength="2000" placeholder="https://" value="${esc(item.link||'')}">${wishlistPriceFields(item)}<p id="wishlistError" class="form-error" role="alert"></p><div class="wish-form-actions"><button class="primary" type="submit">salvar desejo</button><button class="secondary" type="button" data-wish="cancel">cancelar</button></div></form>`;
}
function paintWishlist(){
 if(state.view!=='wishlist')return;
 const items=wishlistItems.filter(w=>Boolean(w.completed)===(wishlistFilter==='done'));
 $('#content').innerHTML=`<section class="wishlist-panel" aria-labelledby="wishlistTitle"><header class="wish-heading"><div><h2 id="wishlistTitle">wishlist</h2><p>${wishlistDescription}</p></div>${!wishlistFormOpen?'<button class="primary" data-wish="new">adicionar desejo</button>':''}</header>${wishlistFormOpen?wishlistForm():''}<nav class="wish-filters" aria-label="filtrar desejos"><button class="secondary" data-wish-filter="pending" aria-pressed="${wishlistFilter==='pending'}">quero viver <span>${wishlistItems.filter(w=>!w.completed).length}</span></button><button class="secondary" data-wish-filter="done" aria-pressed="${wishlistFilter==='done'}">realizados <span>${wishlistItems.filter(w=>w.completed).length}</span></button></nav><p id="wishActionError" class="form-error" role="alert"></p>${items.length?`<ul class="wish-list">${items.map(w=>`<li class="wish-item" data-wish-id="${esc(w.id)}"><div class="wish-copy"><h3 data-user-content>${esc(w.title)}</h3>${w.notes?`<p data-user-content>${esc(w.notes)}</p>`:''}${w.amount!=null||w.valueClass?`<p class="wish-value">${w.amount!=null?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(w.amount)+' · ':''}${esc(wishValueLabels[wishlistValueClass(w)]||'')}</p>`:''}${w.link?`<a class="text-button wish-link" href="${esc(w.link)}" target="_blank" rel="noopener noreferrer">abrir link ↗</a>`:''}</div><div class="wish-actions"><button class="secondary" data-wish="toggle" data-id="${esc(w.id)}">${w.completed?'voltar à lista':'marcar como realizado'}</button><button class="text-button" data-wish="edit" data-id="${esc(w.id)}">editar</button><button class="text-button" data-wish="delete" data-id="${esc(w.id)}">excluir</button></div>${wishlistDeleting===w.id?`<div class="wish-delete"><p>excluir este desejo?</p><button class="danger" data-wish="confirm-delete" data-id="${esc(w.id)}">excluir desejo</button><button class="secondary" data-wish="keep">manter</button></div>`:''}</li>`).join('')}</ul>`:`<div class="wish-empty">${icon('star')}<h3>${wishlistFilter==='done'?'suas experiências ficam guardadas aqui':'o que você quer viver?'}</h3><p>${wishlistFilter==='done'?'marque um desejo como realizado quando acontecer.':'guarde uma ideia para quando chegar a hora.'}</p>${!wishlistFormOpen&&wishlistFilter==='pending'?'<button class="secondary" data-wish="new">adicionar primeiro desejo</button>':''}</div>`}</section>`;
 if(wishlistBusy)$('#content').querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);
}
async function renderWishlist(){
 const mode=state.demo?'demo':'real',token=++wishlistLoad;
 if(wishlistMode===mode){paintWishlist();return}
 wishlistMode=null;wishlistDraft=null;wishlistFormOpen=false;wishlistEditing=null;wishlistDeleting=null;
 $('#content').innerHTML='<section class="wishlist-panel"><h2>wishlist</h2><p role="status">abrindo seus desejos…</p></section>';
 try{
  const items=state.demo?wishlistDemo:await api('/wishlist');
  if(token!==wishlistLoad||state.view!=='wishlist'||mode!==(state.demo?'demo':'real'))return;
  wishlistItems=items;wishlistMode=mode;paintWishlist();
 }catch(error){if(token!==wishlistLoad||state.view!=='wishlist')return;$('#content').innerHTML=`<section class="wishlist-panel"><h2>wishlist</h2><p role="alert">${esc(error.message)}</p><button class="secondary" data-wish="retry">tentar novamente</button></section>`}
}
async function changeWish(method,id,body){
 if(state.demo){
  if(method==='POST'){const item={...body,id:crypto.randomUUID(),completed:0};wishlistDemo=[item,...wishlistDemo];return item}
  const item=wishlistDemo.find(w=>w.id===id);
  if(method==='DELETE')wishlistDemo=wishlistDemo.filter(w=>w.id!==id);else Object.assign(item,body);
  return item;
 }
 return api('/wishlist'+(id?'/'+encodeURIComponent(id):''),method,body);
}
async function wishlistMutation(method,id,body){
 wishlistBusy=true;
 const mode=state.demo?'demo':'real';$('#content').querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);
 try{
  const item=await changeWish(method,id,body);
  if(mode!==(state.demo?'demo':'real')){wishlistMode=null;return}
  if(method==='POST')wishlistItems=[item,...wishlistItems];
  else if(method==='DELETE')wishlistItems=wishlistItems.filter(w=>w.id!==id);
  else wishlistItems=wishlistItems.map(w=>w.id===id?item:w);
  wishlistDraft=null;wishlistFormOpen=false;wishlistEditing=null;wishlistDeleting=null;wishlistBusy=false;paintWishlist();toast(method==='DELETE'?'desejo excluído.':'desejo salvo.');
 }catch(error){
  wishlistBusy=false;
  if(state.view==='wishlist'){const target=$('#wishlistError')||$('#wishActionError');if(target)target.textContent=error.message;$('#content').querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false)}
 }finally{wishlistBusy=false}
}
document.addEventListener('click',event=>{
 const filter=event.target.closest('[data-wish-filter]');
 if(filter&&!wishlistBusy){wishlistFilter=filter.dataset.wishFilter;wishlistDeleting=null;paintWishlist();return}
 const button=event.target.closest('[data-wish]');if(!button||wishlistBusy)return;
 const {wish,id}=button.dataset;
 if(wish==='retry'){renderWishlist();return}
 if(wish==='new'||wish==='edit'){wishlistFormOpen=true;wishlistEditing=id||null;wishlistDraft={...(wishlistItems.find(w=>w.id===id)||{})};wishlistDeleting=null;paintWishlist();$('#wishlistForm')?.scrollIntoView({block:'nearest'});return}
 if(wish==='cancel'){wishlistDraft=null;wishlistFormOpen=false;wishlistEditing=null;paintWishlist()}
 if(wish==='delete'){wishlistDeleting=id;paintWishlist()}
 if(wish==='keep'){wishlistDeleting=null;paintWishlist()}
 if(wish==='confirm-delete')wishlistMutation('DELETE',id);
 if(wish==='toggle'){const item=wishlistItems.find(w=>w.id===id);if(item)wishlistMutation('PATCH',id,{completed:!item.completed})}
});
document.addEventListener('submit',event=>{
 if(event.target.id!=='wishlistForm')return;event.preventDefault();if(wishlistBusy)return;
 const form=event.target;if(!form.reportValidity())return;
 const values=new FormData(form),body={title:values.get('title'),notes:values.get('notes'),link:values.get('link'),...wishlistPriceValues()};
 if(!body.title.trim()){$('#wishlistError').textContent='escreva o nome do desejo.';return}
 wishlistMutation(wishlistEditing?'PATCH':'POST',wishlistEditing,body);
});

document.addEventListener('input',event=>{if(event.target.closest('#wishlistForm')){const form=new FormData($('#wishlistForm'));wishlistDraft={...Object.fromEntries(form),...wishlistPriceValues()}}});
