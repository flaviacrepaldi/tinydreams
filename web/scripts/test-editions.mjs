import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calendarParts,editionForDate} from '../ui/theme-clock.mjs';
const editions=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8'));
assert.equal(editions.length,12);assert.equal(new Set(editions.map(e=>e.id)).size,12);
for(let index=0;index<editions.length;index++){
  const date=new Date(Date.UTC(2026,9+index,1,3));
  const expected=date.toISOString().slice(0,7);
  assert.equal(editions[index].id,expected);
  assert.equal(editionForDate(editions,date).id,expected);
  if(index>0)assert.equal(editionForDate(editions,new Date(date.getTime()-1)).id,editions[index-1].id);
  const e=editions[index];assert.ok(e.name&&e.title&&e.subtitle&&e.layout);assert.equal(e.objects.length,3);assert.ok(Object.values(e.tokens).every(v=>/^#[a-f0-9]{6}$/i.test(v)));
  if(index>0)assert.equal(e.asset,`/editions/${e.id}.png`);
}
assert.equal(new Set(editions.map(e=>e.layout)).size,12,'Every edition has its own composition');
assert.equal(new Set(editions.map(e=>e.celebrationAsset)).size,12,'Every edition has a distinct celebration atlas');
for(const e of editions){
 const data=await readFile(new URL('../assets'+e.celebrationAsset,import.meta.url));
 assert.equal(data.readUInt32BE(0),0x89504e47,e.id+' real PNG atlas');
 assert.equal(data.readUInt32BE(16),data.readUInt32BE(20),e.id+' square 4 by 4 atlas');
 assert.equal(data[25],6,e.id+' transparent RGBA atlas');
}
console.log('PASS: twelve distinct transparent square celebration atlases.');
assert.equal(calendarParts(new Date('2027-01-12T02:59:59.999Z')).birthday,false);
assert.equal(calendarParts(new Date('2027-01-12T03:00:00Z')).birthday,true);
assert.equal(calendarParts(new Date('2027-01-13T03:00:00Z')).birthday,false);
assert.equal(editionForDate(editions,new Date('2028-01-01T03:00:00Z')).id,'2027-09','Do not silently repeat an old yearly schedule');
assert.equal(editionForDate(editions,new Date('2025-01-01T03:00:00Z')).id,'2026-10');
assert.throws(()=>calendarParts(new Date('invalid')),/Invalid theme date/);
console.log('PASS: 12 distinct edition compositions, Sao Paulo monthly boundaries, birthday boundary, and bounded schedule fallback.');

function luminance(color){const rgb=color.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
for(const e of editions)for(const key of ['--text','--muted','--goal-lavender','--goal-peach','--goal-sage']){
  const a=luminance(e.tokens[key]),b=luminance(e.tokens['--surface']);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,e.id+' insufficient contrast for '+key);
}
console.log('PASS: text, secondary labels, and goal labels retain 4.5:1 contrast in all editions.');
