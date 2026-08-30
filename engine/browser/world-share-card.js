import { SHARE_CARD_FORMATS, drawShareCard } from '../src/share-card.js';

const style = document.createElement('style');
style.textContent = `
  .hm-share-launch{position:fixed;z-index:90;left:14px;bottom:14px;border:1px solid rgba(47,32,18,.55);background:#f7f1e4;color:#3f2e20;padding:10px 13px;font:800 10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 8px 20px rgba(36,25,15,.15);cursor:pointer}
  .hm-share-modal{position:fixed;z-index:100;inset:0;display:grid;place-items:center;padding:20px;background:rgba(25,18,12,.58)}
  .hm-share-modal[hidden]{display:none}.hm-share-panel{width:min(950px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:18px;background:#f7f1e4;border:1px solid #493526;box-shadow:0 20px 80px rgba(0,0,0,.35);color:#2b1d13;font-family:Arial,sans-serif}
  .hm-share-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:14px}.hm-share-head h2{margin:3px 0 0;font:700 25px Georgia,serif}.hm-share-kicker{font-size:9px;font-weight:800;letter-spacing:.16em;color:#624b35}.hm-share-close{border:0;background:transparent;font-size:25px;cursor:pointer;color:#493526}
  .hm-share-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:18px}.hm-share-preview{width:100%;display:block;border:1px solid #493526;background:#eee5d6}.hm-share-controls{display:grid;align-content:start;gap:10px}.hm-share-controls label{display:grid;gap:5px;font-size:9px;font-weight:800;letter-spacing:.11em;color:#624b35}.hm-share-controls input,.hm-share-controls textarea,.hm-share-controls select{width:100%;box-sizing:border-box;border:1px solid rgba(73,53,38,.45);border-radius:0;background:#fffaf2;color:#2b1d13;padding:9px;font:14px Georgia,serif}.hm-share-controls textarea{min-height:88px;resize:vertical}.hm-share-actions{display:flex;gap:8px;flex-wrap:wrap}.hm-share-actions button{border:1px solid #493526;background:#3f2e20;color:#fffaf2;padding:10px 12px;font:800 10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.hm-share-actions button.alt{background:#fffaf2;color:#3f2e20}
  @media(max-width:700px){.hm-share-launch{left:auto;right:8px;bottom:58px}.hm-share-modal{padding:0;align-items:end}.hm-share-panel{max-height:92dvh;border-width:1px 0 0}.hm-share-grid{grid-template-columns:1fr}.hm-share-head h2{font-size:22px}}
`;
document.head.append(style);

const state = { format: 'instagram', title: 'Histomap: The World', timeframe: focusedYear(), context: 'A visual argument in historical streams.', image: null };
const launch = button('Make share graphic', 'hm-share-launch');
launch.addEventListener('click', openComposer); document.body.append(launch);

function button(label, className) { const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.className = className; return el; }

async function openComposer() {
  try { state.image = await snapshotMap(); } catch (error) { console.error(error); alert('The current map view could not be captured yet. Let the map settle, then try again.'); return; }
  const modal = document.createElement('section'); modal.className = 'hm-share-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Share graphic composer');
  modal.innerHTML = `<div class="hm-share-panel"><div class="hm-share-head"><div><div class="hm-share-kicker">HISTOMAPS.ORG · SHARE CARD</div><h2>Frame the current map view</h2></div><button class="hm-share-close" type="button" aria-label="Close">×</button></div><div class="hm-share-grid"><canvas class="hm-share-preview" aria-label="Share graphic preview"></canvas><div class="hm-share-controls"><label>FORMAT<select data-field="format">${Object.entries(SHARE_CARD_FORMATS).map(([id, item]) => `<option value="${id}">${item.label}</option>`).join('')}</select></label><label>TITLE<input data-field="title" maxlength="58"></label><label>TIMEFRAME / TAG<input data-field="timeframe" maxlength="42"></label><label>CONTEXT<textarea data-field="context" maxlength="150"></textarea></label><div class="hm-share-actions"><button data-action="download">Download PNG</button><button class="alt" data-action="share">Share image</button></div><small>Navigate the map first; this card uses the exact view currently on screen. It includes Histomaps.org credit automatically.</small></div></div></div>`;
  document.body.append(modal);
  for (const [field, value] of Object.entries(state)) { const input = modal.querySelector(`[data-field="${field}"]`); if (input) input.value = value; }
  const preview = modal.querySelector('canvas');
  const render = () => { for (const field of ['format', 'title', 'timeframe', 'context']) state[field] = modal.querySelector(`[data-field="${field}"]`).value; drawShareCard(preview, state.image, state); };
  modal.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', render)); render();
  modal.querySelector('.hm-share-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.remove(); });
  modal.querySelector('[data-action="download"]').addEventListener('click', () => download(preview));
  modal.querySelector('[data-action="share"]').addEventListener('click', () => share(preview));
}

function focusedYear() {
  const value = document.querySelector('#focusNumber')?.value || document.querySelector('.focus-pill strong')?.textContent?.trim();
  return value ? `Focus: ${value}` : 'World history';
}

async function snapshotMap() {
  const svg = document.querySelector('#histomap'); if (!(svg instanceof SVGElement)) throw new Error('Map SVG unavailable');
  const box = svg.getBoundingClientRect(); const clone = svg.cloneNode(true); inlineStyles(svg, clone);
  clone.setAttribute('width', String(Math.round(box.width))); clone.setAttribute('height', String(Math.round(box.height)));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob); const image = new Image();
  image.decoding = 'sync'; await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; }); URL.revokeObjectURL(url); return image;
}

function inlineStyles(source, clone) {
  const properties = ['fill', 'stroke', 'stroke-width', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'paint-order', 'stroke-linejoin', 'stroke-linecap', 'display', 'visibility'];
  const original = [source, ...source.querySelectorAll('*')]; const copied = [clone, ...clone.querySelectorAll('*')];
  original.forEach((element, index) => { const computed = getComputedStyle(element); const css = properties.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(';'); copied[index]?.setAttribute('style', css); });
}

function blobFrom(canvas) { return new Promise((resolve) => canvas.toBlob(resolve, 'image/png')); }
async function download(canvas) { const blob = await blobFrom(canvas); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'histomap-share-card.png'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
async function share(canvas) { const blob = await blobFrom(canvas); const file = new File([blob], 'histomap-share-card.png', { type: 'image/png' }); if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: state.title, text: state.context }); else download(canvas); }
