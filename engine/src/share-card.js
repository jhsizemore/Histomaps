export const SHARE_CARD_FORMATS = Object.freeze({
  instagram: { label: 'Instagram portrait', width: 1080, height: 1350 },
  square: { label: 'Instagram square', width: 1080, height: 1080 },
  x: { label: 'X landscape', width: 1600, height: 900 }
});

/** Return the stable layout geometry used by every Histomap share-card renderer. */
export function createShareCardPlan(format = 'instagram') {
  const size = SHARE_CARD_FORMATS[format] || SHARE_CARD_FORMATS.instagram;
  const pad = Math.round(size.width * 0.055);
  const header = Math.round(size.height * 0.16);
  const footer = Math.round(size.height * 0.12);
  return {
    ...size,
    pad,
    header,
    footer,
    map: { x: pad, y: header, width: size.width - (pad * 2), height: size.height - header - footer - pad }
  };
}

/**
 * Compose a captured map image into a branded social card. The caller supplies
 * the canvas and current viewport image so the engine stays independent of any
 * particular Histomap renderer.
 */
export function drawShareCard(canvas, image, { format = 'instagram', title = 'Histomap: The World', kicker = 'HISTOMAPS.ORG', timeframe = '', context = '' } = {}) {
  const plan = createShareCardPlan(format);
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  const { width, height, pad, header, footer, map } = plan;
  ctx.fillStyle = '#eee5d6'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(47, 32, 18, .75)'; ctx.lineWidth = Math.max(2, width / 720); ctx.strokeRect(pad * .42, pad * .42, width - pad * .84, height - pad * .84);
  ctx.fillStyle = '#624b35'; ctx.font = `700 ${Math.round(width * .019)}px Arial, sans-serif`; ctx.letterSpacing = `${Math.round(width * .004)}px`;
  ctx.fillText(kicker.toUpperCase(), pad, Math.round(pad * 1.25));
  ctx.fillStyle = '#2b1d13'; ctx.font = `700 ${Math.round(width * .052)}px Georgia, serif`; ctx.fillText(title, pad, Math.round(pad * 2.55));
  if (timeframe) {
    ctx.fillStyle = '#3f2e20'; ctx.font = `700 ${Math.round(width * .018)}px Arial, sans-serif`;
    const label = timeframe.toUpperCase(); const labelWidth = ctx.measureText(label).width + pad * .75;
    ctx.fillStyle = '#d8c8b0'; ctx.fillRect(width - pad - labelWidth, Math.round(pad * .73), labelWidth, Math.round(pad * .72));
    ctx.fillStyle = '#3f2e20'; ctx.fillText(label, width - pad - labelWidth + pad * .38, Math.round(pad * 1.23));
  }
  ctx.fillStyle = '#f7f1e4'; ctx.fillRect(map.x - 8, map.y - 8, map.width + 16, map.height + 16);
  ctx.strokeStyle = '#493526'; ctx.lineWidth = Math.max(2, width / 720); ctx.strokeRect(map.x - 8, map.y - 8, map.width + 16, map.height + 16);
  drawCover(ctx, image, map.x, map.y, map.width, map.height);
  ctx.fillStyle = '#5a493b'; ctx.font = `400 ${Math.round(width * .020)}px Georgia, serif`;
  const copy = context || 'A visual argument in historical streams.';
  wrapText(ctx, copy, pad, height - footer + Math.round(pad * .25), width - pad * 2, Math.round(width * .030));
  ctx.fillStyle = '#624b35'; ctx.font = `700 ${Math.round(width * .016)}px Arial, sans-serif`; ctx.fillText('INTERACTIVE VISUAL HISTORY  ·  HISTOMAPS.ORG', pad, height - Math.round(pad * .55));
  return plan;
}

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale; const drawnHeight = image.height * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight); ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = ''; let row = 0;
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { ctx.fillText(line, x, y + (row++ * lineHeight)); line = word; }
    else line = candidate;
  }
  if (line) ctx.fillText(line, x, y + (row * lineHeight));
}
