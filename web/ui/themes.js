// Wrapped with the catalog and date functions by compile.mjs. Only presentation changes.
let preview=null;
let current;
let lastDate='';
const root=document.documentElement;
function applyEdition(){
  const date=new Date();
  const actual=editionForDate(editions,date);
  const selected=editions.find(e=>e.id===preview)||actual;
  const dateKey=calendarParts(date).edition+'-'+calendarParts(date).day;
  const changed=current?.id!==selected.id||lastDate!==dateKey;
  current=selected;lastDate=dateKey;
  root.dataset.edition=selected.id;root.dataset.layout=selected.layout;root.dataset.atmosphere=selected.atmosphere;root.dataset.paper=String(selected.light);
  for(const [token,value]of Object.entries(selected.tokens))root.style.setProperty(token,value);
  if(selected.geometry){root.style.setProperty('--object-aspect',String(selected.geometry.objectAspect));root.style.setProperty('--object-sheet-height',selected.geometry.objectSheetHeight+'%');root.style.setProperty('--scene-ratio',String(selected.geometry.sceneRatio));}
  if(selected.asset){root.style.setProperty('--edition-scene',`url("${selected.asset}")`);root.style.setProperty('--edition-objects',`url("${selected.asset}")`);}
  else{root.style.removeProperty('--edition-scene');root.style.removeProperty('--edition-objects');}
  document.querySelector('.edition').replaceChildren(document.createTextNode(selected.name.toLocaleLowerCase('pt-BR')));
  const label=document.createElement('span');label.textContent=`${selected.month.toLocaleLowerCase('pt-BR')} · ${selected.id.slice(0,4)}`;document.querySelector('.edition').append(label);
  const title=document.querySelector('h1');title.replaceChildren(document.createTextNode(selected.title),document.createElement('br'));
  const emphasis=document.createElement('em');emphasis.textContent=selected.emphasis;title.append(emphasis);
  document.querySelector('.intro').textContent=selected.subtitle;
  const world=document.querySelector('#settingsDialog .settings-section');world.querySelector('p').textContent=`${selected.name} · ${selected.month} ${selected.id.slice(0,4)}`;
  world.querySelector('p.muted').textContent='A edição muda automaticamente pelo mês. Seus hábitos e registros continuam os mesmos.';
  const parts=calendarParts(date);if(!preview&&parts.birthday&&selected.id==='2027-01'){title.firstChild.textContent='Feliz aniversário!';emphasis.textContent='Um novo capítulo seu.';document.querySelector('.intro').textContent='Hoje é dia de celebrar você e as histórias que ainda vai viver.';}
  document.title=`tiny dreams · ${selected.name.toLocaleLowerCase('pt-BR')}`;
  document.querySelector('#dateLabel').textContent=date.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:THEME_TIME_ZONE});
  if(changed)document.dispatchEvent(new CustomEvent('dreameditionchange',{detail:{id:selected.id,preview:!!preview}}));
}
function reset(){preview=null;applyEdition();}
// An open tab also changes edition at the first check after local midnight.
setInterval(()=>{if(document.hidden||preview)return;const parts=calendarParts();if(parts.edition+'-'+parts.day!==lastDate)applyEdition();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!preview)applyEdition();});
window.DreamThemes={forCreation(createdAt){const date=new Date(createdAt);return createdAt&&Number.isFinite(date.getTime())?editionForDate(editions,date):current;},get current(){return current;},get previewId(){return preview;},preview(id){if(!editions.some(e=>e.id===id))throw Error('Unknown edition');preview=id;applyEdition();},reset};
applyEdition();
