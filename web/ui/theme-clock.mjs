export const THEME_TIME_ZONE='America/Sao_Paulo';
export function calendarParts(date=new Date()){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))throw new TypeError('Invalid theme date');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:THEME_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  return {edition:`${parts.year}-${parts.month}`,day:parts.day,birthday:parts.month==='01'&&parts.day==='12'};
}
export function editionForDate(editions,date=new Date()){
  const key=calendarParts(date).edition;
  const exact=editions.find(e=>e.id===key);
  if(exact)return exact;
  const ordered=[...editions].sort((a,b)=>a.id.localeCompare(b.id));
  return key<ordered[0].id?ordered[0]:ordered.at(-1);
}
