import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {brandMonogram,brandHat,brandIconSVG} from '../shared/brand.js';
const editions=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8'));
assert.equal(new Set(editions.map(e=>brandHat(e.layout))).size,12,'Each prepared edition has its own hat');
for(const edition of editions){assert.ok(brandHat(edition.layout).includes(`data-hat="${edition.layout}"`));assert.ok(brandMonogram.includes('brand-spark'))}
assert.equal(brandHat('unknown'),brandHat('halloween'));
assert.ok(!brandIconSVG().includes('brand-hat'),'The installed icon has no seasonal decoration');
assert.ok(brandIconSVG().includes('brand-letters')&&brandIconSVG().includes('brand-spark'));
assert.equal(await readFile(new URL('../assets/icon.svg',import.meta.url),'utf8'),brandIconSVG());
console.log('PASS: fixed td monogram and spark, twelve seasonal hats, safe fallback and nonseasonal installation icon.');
