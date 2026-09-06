#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const starWars = path.resolve(__dirname, '..', '..');
global.window = {};
for (const file of ['data.js', 'expanded-data.js', 'lifelines.js']) {
  const full = path.join(starWars, file);
  vm.runInThisContext(fs.readFileSync(full, 'utf8'), { filename: full });
}

const web = global.window.HISTOMAP;
const posterPath = path.join(__dirname, 'star-wars-poster-data.json');
const poster = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
const syncKeys = ['height', 'anchors', 'eras', 'sources', 'factions', 'states', 'events', 'screen', 'undatedScreen', 'legends', 'lifelines'];

function samePrimitive(a, b) {
  return Object.is(a, b);
}

function diff(a, b, here, out) {
  if (samePrimitive(a, b)) return;
  const aa = Array.isArray(a), ba = Array.isArray(b);
  if (aa || ba) {
    if (!(aa && ba)) {
      out.push(`${here}: type mismatch (${aa ? 'array' : typeof a} vs ${ba ? 'array' : typeof b})`);
      return;
    }
    if (a.length !== b.length) out.push(`${here}: length ${a.length} (web) vs ${b.length} (poster)`);
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) diff(a[i], b[i], `${here}[${i}]`, out);
    return;
  }
  const ao = a && typeof a === 'object', bo = b && typeof b === 'object';
  if (ao || bo) {
    if (!(ao && bo)) {
      out.push(`${here}: type mismatch (${typeof a} vs ${typeof b})`);
      return;
    }
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const key of keys) {
      if (!(key in a)) out.push(`${here}.${key}: missing on web`);
      else if (!(key in b)) out.push(`${here}.${key}: missing on poster`);
      else diff(a[key], b[key], `${here}.${key}`, out);
    }
    return;
  }
  out.push(`${here}: ${JSON.stringify(a)} (web) != ${JSON.stringify(b)} (poster)`);
}

const differences = [];
for (const key of syncKeys) {
  if (!(key in web)) differences.push(`${key}: missing on web`);
  else if (!(key in poster)) differences.push(`${key}: missing on poster`);
  else diff(web[key], poster[key], key, differences);
}

const webScreenIds = new Set((web.screen || []).map(x => x.id));
const posterScreenIds = new Set((poster.screen || []).map(x => x.id));
const webLifeIds = new Set((web.lifelines || []).map(x => x.id));
const posterLifeIds = new Set((poster.lifelines || []).map(x => x.id));
const webEventIds = new Set((web.events || []).map(x => x.id));
const posterEventIds = new Set((poster.events || []).map(x => x.id));

function setDelta(a, b) { return [...a].filter(x => !b.has(x)); }

console.log('STAR WARS HISTOMAP · WEBSITE ↔ POSTER DATA AUDIT');
console.log(`web:    ${path.relative(process.cwd(), starWars)}/data.js + expanded-data.js + lifelines.js`);
console.log(`poster: ${path.relative(process.cwd(), posterPath)}`);
console.log('');
console.log(`Events:     ${webEventIds.size} web / ${posterEventIds.size} poster`);
console.log(`Screen:     ${webScreenIds.size} web / ${posterScreenIds.size} poster`);
console.log(`Lifelines:  ${webLifeIds.size} web / ${posterLifeIds.size} poster`);
console.log(`Factions:   ${(web.factions || []).length} web / ${(poster.factions || []).length} poster`);
console.log('');
for (const [label, a, b] of [
  ['Events only on web', webEventIds, posterEventIds],
  ['Events only on poster', posterEventIds, webEventIds],
  ['Screen titles only on web', webScreenIds, posterScreenIds],
  ['Screen titles only on poster', posterScreenIds, webScreenIds],
  ['Lifelines only on web', webLifeIds, posterLifeIds],
  ['Lifelines only on poster', posterLifeIds, webLifeIds],
]) {
  const d = setDelta(a, b);
  if (d.length) console.log(`${label}: ${d.join(', ')}`);
}

if (differences.length) {
  console.log(`\nDRIFT FOUND: ${differences.length} field-level difference(s).`);
  differences.slice(0, 250).forEach(d => console.log(`- ${d}`));
  if (differences.length > 250) console.log(`- … ${differences.length - 250} more`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: all synchronized timeline fields are identical.');
}
