#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const starWars = path.resolve(__dirname, '..', '..');
global.window = {};
for (const file of ['data.js', 'expanded-data.js', 'lifelines.js', 'insignia.js', 'title-art.js']) {
  const full = path.join(starWars, file);
  vm.runInThisContext(fs.readFileSync(full, 'utf8'), { filename: full });
}

const web = global.window.HISTOMAP;
const posterPath = path.join(__dirname, 'star-wars-poster-data.json');
const poster = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
const artManifestPath = path.join(__dirname, 'title-art', 'manifest.json');
const artManifest = JSON.parse(fs.readFileSync(artManifestPath, 'utf8'));
const symbolDir = path.join(__dirname, 'faction-symbols');
const renderPath = path.join(__dirname, 'render.py');
const renderText = fs.readFileSync(renderPath, 'utf8');
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

const visualIssues = [];
const titleArt = web.titleArt || { assets: {}, legends: {}, undated: {} };
for (const item of web.screen || []) {
  const live = titleArt.assets[item.id];
  const staticArt = artManifest[item.id];
  if (!live) visualIssues.push(`title art: ${item.id} missing from website title-art.js`);
  if (!staticArt) visualIssues.push(`title art: ${item.id} missing from poster manifest`);
  if (live && staticArt) {
    if (live.title !== staticArt.title) visualIssues.push(`title art: ${item.id} title differs (${JSON.stringify(live.title)} vs ${JSON.stringify(staticArt.title)})`);
    if (live.source !== staticArt.source_page) visualIssues.push(`title art: ${item.id} source differs`);
  }
}
for (const [eventId, key] of Object.entries(titleArt.legends || {})) {
  if (!artManifest[key]) visualIssues.push(`Legends title art: ${eventId} -> ${key} missing from poster manifest`);
}
for (const [label, key] of Object.entries(titleArt.undated || {})) {
  if (!artManifest[key]) visualIssues.push(`Undated title art: ${label} -> ${key} missing from poster manifest`);
}

const insignia = web.insignia || { assets: {}, factions: {} };
for (const key of Object.keys(insignia.assets || {})) {
  const mask = path.join(symbolDir, `${key}-mask.png`);
  if (!fs.existsSync(mask)) visualIssues.push(`insignia: poster mask missing for ${key}`);
}
for (const [factionId, keys] of Object.entries(insignia.factions || {})) {
  for (const key of keys) {
    if (!insignia.assets[key]) visualIssues.push(`insignia: ${factionId} references unknown website asset ${key}`);
    if (!fs.existsSync(path.join(symbolDir, `${key}-mask.png`))) visualIssues.push(`insignia: ${factionId} references ${key}, but poster mask is missing`);
  }
}

const canonMapMatch = renderText.match(/faction_symbols=\{([^\n]+)\}/);
if (!canonMapMatch) {
  visualIssues.push('insignia: could not locate poster faction_symbols mapping');
} else {
  try {
    const canonMap = JSON.parse(`{${canonMapMatch[1].replace(/'/g, '"')}}`);
    for (const [factionId, key] of Object.entries(canonMap)) {
      const allowed = insignia.factions[factionId] || [];
      if (!allowed.includes(key)) visualIssues.push(`insignia: poster maps ${factionId} -> ${key}, website allows ${allowed.join(', ') || 'none'}`);
    }
  } catch (err) {
    visualIssues.push(`insignia: could not parse poster faction_symbols mapping (${err.message})`);
  }
}

const literalSymbols = new Set();
for (const re of [/symbol\('([^']+)'/g, /band_symbol\([^\n]*?'([^']+)'(?:,|\))/g]) {
  let m;
  while ((m = re.exec(renderText))) literalSymbols.add(m[1]);
}
for (const key of literalSymbols) {
  if (!fs.existsSync(path.join(symbolDir, `${key}-mask.png`))) visualIssues.push(`insignia: renderer calls ${key}, but no poster mask exists`);
}

console.log('STAR WARS HISTOMAP · WEBSITE ↔ POSTER DATA AUDIT');
console.log(`web:    ${path.relative(process.cwd(), starWars)}/data.js + expanded-data.js + lifelines.js`);
console.log(`poster: ${path.relative(process.cwd(), posterPath)}`);
console.log('');
console.log(`Events:     ${webEventIds.size} web / ${posterEventIds.size} poster`);
console.log(`Screen:     ${webScreenIds.size} web / ${posterScreenIds.size} poster`);
console.log(`Lifelines:  ${webLifeIds.size} web / ${posterLifeIds.size} poster`);
console.log(`Factions:   ${(web.factions || []).length} web / ${(poster.factions || []).length} poster`);
console.log(`Title art:  ${Object.keys(titleArt.assets || {}).length} website assets / ${Object.keys(artManifest).length} poster assets`);
console.log(`Insignia:   ${Object.keys(insignia.assets || {}).length} website assets / ${fs.readdirSync(symbolDir).filter(x => x.endsWith('-mask.png')).length} poster masks`);
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

if (differences.length || visualIssues.length) {
  if (differences.length) {
    console.log(`\nDATA DRIFT FOUND: ${differences.length} field-level difference(s).`);
    differences.slice(0, 250).forEach(d => console.log(`- ${d}`));
    if (differences.length > 250) console.log(`- … ${differences.length - 250} more`);
  }
  if (visualIssues.length) {
    console.log(`\nVISUAL-ID DRIFT FOUND: ${visualIssues.length} issue(s).`);
    visualIssues.forEach(d => console.log(`- ${d}`));
  }
  process.exitCode = 1;
} else {
  console.log('\nPASS: timeline data, title-art identity, and faction-symbol identity are synchronized.');
}
