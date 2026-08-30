import { SHARE_CARD_FORMATS, drawShareCard } from '../src/share-card.js';
import { extractShareContext, defaultShareCopy } from '../src/extract-share-context.js';
import { readWorldShareContext } from './world-share-context.js';

const style = document.createElement('style');
style.textContent = `
  .hm-share-launch{position:fixed;z-index:90;left:14px;bottom:14px;border:1px solid rgba(47,32,18,.55);background:#f7f1e4;color:#3f2e20;padding:10px 13px;font:800 10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 8px 20px rgba(36,25,15,.15);cursor:pointer}
  .hm-share-modal{position:fixed;z-index:100;inset:0;display:grid;place-items:center;padding:20px;background:rgba(25,18,12,.58)}
  .hm-share-panel{width:min(1080px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:18px;background:#f7f1e4;border:1px solid #493526;box-shadow:0 20px 80px rgba(0,0,0,.35);color:#2b1d13;font-family:Arial,sans-serif}
  .hm-share-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:14px}.hm-share-head h2{margin:3px 0 0;font:700 25px Georgia,serif}.hm-share-kicker{font-size:9px;font-weight:800;letter-spacing:.16em;color:#624b35}.hm-share-close{border:0;background:transparent;font-size:25px;cursor:pointer;color:#493526}
  .hm-share-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(310px,.8fr);gap:18px}.hm-share-preview{width:100%;display:block;border:1px solid #493526;background:#eee5d6}.hm-share-controls{display:grid;align-content:start;gap:10px}.hm-share-controls label{display:grid;gap:5px;font-size:9px;font-weight:800;letter-spacing:.11em;color:#624b35}.hm-share-controls input,.hm-share-controls textarea,.hm-share-controls select{width:100%;box-sizing:border-box;border:1px solid rgba(73,53,38,.45);border-radius:0;background:#fffaf2;color:#2b1d13;padding:9px;font:14px Georgia,serif}.hm-share-controls textarea{min-height:82px;resize:vertical}
  .hm-share-toggles{display:grid;grid-template-columns:1fr 1fr;gap:7px 10px;padding:10px;border:1px solid rgba(73,53,38,.25);background:rgba(255,250,242,.55)}.hm-share-toggles label{display:flex;align-items:center;gap:7px;font-size:9px;letter-spacing:.06em}.hm-share-toggles input{width:auto;margin:0}.hm-share-detected{padding:10px;background:#e9dfcf;border:1px solid rgba(73,53,38,.25);font:11px/1.45 Arial,sans-serif;color:#594737}.hm-share-detected strong{color:#2b1d13}.hm-share-detected a{color:#493526}.hm-share-actions{display:flex;gap:8px;flex-wrap:wrap}.hm-share-actions button{border:1px solid #493526;background:#3f2e20;color:#fffaf2;padding:10px 12px;font:800 10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.hm-share-actions button.alt{background:#fffaf2;color:#3f2e20}.hm-share-help{font:10px/1.45 Arial,sans-serif;color:#695848}
  @media(max-width:760px){.hm-share-launch{left:auto;right:8px;bottom:58px}.hm-share-modal{padding:0;align-items:end}.hm-share-panel{max-height:94dvh;border-width:1px 0 0}.hm-share-grid{grid-template-columns:1fr}.hm-share-head h2{font-size:22px}.hm-share-toggles{grid-template-columns:1fr 1fr}}
`;
document.head.append(style);

const state = {
  format: 'instagram',
  title: 'Histomap: The World',
  timeframe: 'World history',
  context: 'A visual argument in historical streams.',
  image: null,
  shareContext: null,
  options: { showAge: true, showLegend: true, showEvents: true, highlightFocus: true, layoutMode: 'auto' }
};

const launch = button('Make share graphic', 'hm-share-launch');
launch.addEventListener('click', openComposer);
document.body.append(launch);

function button(label, className) {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.className = className; return el;
}

async function openComposer() {
  try {
    state.image = await snapshotMap();
    state.shareContext = extractShareContext(readWorldShareContext());
    Object.assign(state, defaultShareCopy(state.shareContext));
  } catch (error) {
    console.error(error);
    alert('The current map view could not be captured yet. Let the map settle, then try again.');
    return;
  }

  const modal = document.createElement('section');
  modal.className = 'hm-share-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Share graphic composer');
  modal.innerHTML = `<div class="hm-share-panel"><div class="hm-share-head"><div><div class="hm-share-kicker">HISTOMAPS.ORG · SMART SHARE CARD</div><h2>Frame the current map view</h2></div><button class="hm-share-close" type="button" aria-label="Close">×</button></div><div class="hm-share-grid"><canvas class="hm-share-preview" aria-label="Share graphic preview"></canvas><div class="hm-share-controls"><div class="hm-share-detected" data-detected></div><label>FORMAT<select data-field="format">${Object.entries(SHARE_CARD_FORMATS).map(([id, item]) => `<option value="${id}">${item.label}</option>`).join('')}</select></label><label>LAYOUT<select data-option="layoutMode"><option value="auto">Auto — follow map focus</option><option value="overview">Overview</option><option value="focus">Focused empire</option></select></label><label>TITLE<input data-field="title" maxlength="72"></label><label>YEARS / TIMEFRAME<input data-field="timeframe" maxlength="64"></label><label>CONTEXT<textarea data-field="context" maxlength="220"></textarea></label><div class="hm-share-toggles"><label><input type="checkbox" data-option="showAge">Show historical age</label><label><input type="checkbox" data-option="showLegend">Show empires in view</label><label><input type="checkbox" data-option="showEvents">Show key events</label><label><input type="checkbox" data-option="highlightFocus">Emphasize focus</label></div><div class="hm-share-actions"><button data-action="download">Download PNG</button><button class="alt" data-action="share">Share image</button><button class="alt" data-action="defaults">Use detected defaults</button></div><div class="hm-share-help">Navigate and focus the Histomap before opening this composer. The card reads the visible years, labels and focused stream from the current rendered map. Historical-age labels use a locally curated Wikipedia-sourced periodization.</div></div></div></div>`;
  document.body.append(modal);

  syncControlsFromState(modal);
  updateDetectedSummary(modal);
  const preview = modal.querySelector('canvas');
  const render = () => {
    syncStateFromControls(modal);
    drawShareCard(preview, state.image, state);
  };
  modal.querySelectorAll('[data-field],[data-option]').forEach((input) => input.addEventListener('input', render));
  modal.querySelector('.hm-share-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.remove(); });
  modal.querySelector('[data-action="download"]').addEventListener('click', () => download(preview));
  modal.querySelector('[data-action="share"]').addEventListener('click', () => share(preview));
  modal.querySelector('[data-action="defaults"]').addEventListener('click', () => {
    Object.assign(state, defaultShareCopy(state.shareContext));
    syncControlsFromState(modal);
    render();
  });
  render();
}

function syncControlsFromState(modal) {
  for (const field of ['format', 'title', 'timeframe', 'context']) {
    const input = modal.querySelector(`[data-field="${field}"]`); if (input) input.value = state[field] ?? '';
  }
  for (const [key, value] of Object.entries(state.options)) {
    const input = modal.querySelector(`[data-option="${key}"]`); if (!input) continue;
    if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value;
  }
}

function syncStateFromControls(modal) {
  for (const field of ['format', 'title', 'timeframe', 'context']) state[field] = modal.querySelector(`[data-field="${field}"]`)?.value ?? state[field];
  for (const key of Object.keys(state.options)) {
    const input = modal.querySelector(`[data-option="${key}"]`); if (!input) continue;
    state.options[key] = input.type === 'checkbox' ? input.checked : input.value;
  }
}

function updateDetectedSummary(modal) {
  const target = modal.querySelector('[data-detected]');
  const share = state.shareContext;
  const range = share?.yearRange?.label || 'Year range not detected';
  const age = share?.age?.label || 'Age not detected';
  const focus = share?.focusStream?.label || 'No focused empire';
  const streams = (share?.visibleStreams || []).slice(0, 6).map((stream) => stream.label);
  target.replaceChildren();
  const text = document.createElement('div');
  text.innerHTML = `<strong>${escapeHtml(range)}</strong> · ${escapeHtml(age)}<br><strong>${escapeHtml(focus)}</strong><br>${streams.length ? `In view: ${escapeHtml(streams.join(', '))}` : 'Stream labels will improve as the World model is migrated into the engine.'}`;
  target.append(text);
  const urls = share?.age?.sourceUrls || [];
  if (urls.length) {
    const sources = document.createElement('div'); sources.style.marginTop = '5px'; sources.append('Period source: ');
    urls.forEach((url, index) => { const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = index ? 'Wikipedia 2' : 'Wikipedia'; if (index) sources.append(' · '); sources.append(link); });
    target.append(sources);
  }
}

async function snapshotMap() {
  const svg = document.querySelector('#histomap') || document.querySelector('svg');
  if (!(svg instanceof SVGElement)) throw new Error('Map SVG unavailable');
  const box = svg.getBoundingClientRect();
  if (!box.width || !box.height) throw new Error('Map SVG has no visible size');
  const clone = svg.cloneNode(true); inlineStyles(svg, clone);
  clone.setAttribute('width', String(Math.round(box.width))); clone.setAttribute('height', String(Math.round(box.height))); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob); const image = new Image(); image.decoding = 'sync';
  try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; }); }
  finally { URL.revokeObjectURL(url); }
  return image;
}

function inlineStyles(source, clone) {
  const properties = ['fill', 'stroke', 'stroke-width', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'paint-order', 'stroke-linejoin', 'stroke-linecap', 'display', 'visibility'];
  const original = [source, ...source.querySelectorAll('*')]; const copied = [clone, ...clone.querySelectorAll('*')];
  original.forEach((element, index) => { const computed = getComputedStyle(element); const css = properties.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(';'); copied[index]?.setAttribute('style', css); });
}

function blobFrom(canvas) { return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png')); }
async function download(canvas) { const blob = await blobFrom(canvas); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'histomap-share-card.png'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
async function share(canvas) { const blob = await blobFrom(canvas); const file = new File([blob], 'histomap-share-card.png', { type: 'image/png' }); if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: state.title, text: state.context }); else download(canvas); }

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
