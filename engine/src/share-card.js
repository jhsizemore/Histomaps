import { formatYear } from './year-format.js';

export const SHARE_CARD_FORMATS = Object.freeze({
  instagram: { label: 'Instagram portrait', width: 1080, height: 1350 },
  square: { label: 'Instagram square', width: 1080, height: 1080 },
  x: { label: 'X landscape', width: 1600, height: 900 }
});

export function createShareCardPlan(format = 'instagram') {
  const size = SHARE_CARD_FORMATS[format] || SHARE_CARD_FORMATS.instagram;
  const pad = Math.round(size.width * 0.052);
  const header = Math.round(size.height * (format === 'x' ? 0.19 : 0.17));

  if (format === 'x') {
    const gap = Math.round(pad * 0.62);
    const infoWidth = Math.round(size.width * 0.29);
    const mapWidth = size.width - (pad * 2) - gap - infoWidth;
    return {
      ...size, pad, header,
      map: { x: pad, y: header, width: mapWidth, height: size.height - header - pad },
      info: { x: pad + mapWidth + gap, y: header, width: infoWidth, height: size.height - header - pad },
      horizontal: true
    };
  }

  const mapHeight = Math.round(size.height * (format === 'instagram' ? 0.51 : 0.46));
  const gap = Math.round(pad * 0.52);
  return {
    ...size, pad, header,
    map: { x: pad, y: header, width: size.width - (pad * 2), height: mapHeight },
    info: { x: pad, y: header + mapHeight + gap, width: size.width - (pad * 2), height: size.height - (header + mapHeight + gap) - pad },
    horizontal: false
  };
}

export function drawShareCard(canvas, image, {
  format = 'instagram',
  title = 'Histomap: The World',
  kicker = 'HISTOMAPS.ORG',
  timeframe = '',
  context = '',
  shareContext = null,
  options = {}
} = {}) {
  const settings = {
    showAge: true,
    showLegend: true,
    showEvents: true,
    highlightFocus: true,
    layoutMode: 'auto',
    ...options
  };
  const plan = createShareCardPlan(format);
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  const mode = settings.layoutMode === 'auto' ? (shareContext?.mode || 'overview') : settings.layoutMode;
  const focus = mode === 'focus' ? shareContext?.focusStream : null;
  const { width, height, pad, header, map, info } = plan;

  ctx.fillStyle = '#eee5d6'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(47,32,18,.72)'; ctx.lineWidth = Math.max(2, width / 720); ctx.strokeRect(pad * .4, pad * .4, width - pad * .8, height - pad * .8);

  ctx.fillStyle = '#624b35'; ctx.font = `700 ${Math.round(width * .017)}px Arial, sans-serif`;
  ctx.fillText((focus ? `FOCUSED STREAM · ${kicker}` : kicker).toUpperCase(), pad, Math.round(pad * 1.02));

  ctx.fillStyle = '#2b1d13';
  ctx.font = `700 ${Math.round(width * (plan.horizontal ? .041 : .050))}px Georgia, serif`;
  drawTextLines(ctx, title, pad, Math.round(pad * 2.05), width - (pad * 2), Math.round(width * .058), 2);

  const rangeLabel = timeframe || shareContext?.yearRange?.label || '';
  const ageLabel = settings.showAge ? shareContext?.age?.label : '';
  drawHeaderChips(ctx, plan, rangeLabel, ageLabel);

  ctx.fillStyle = '#f7f1e4'; ctx.fillRect(map.x - 8, map.y - 8, map.width + 16, map.height + 16);
  ctx.strokeStyle = focus && settings.highlightFocus ? (focus.color || '#493526') : '#493526';
  ctx.lineWidth = focus && settings.highlightFocus ? Math.max(5, width / 260) : Math.max(2, width / 720);
  ctx.strokeRect(map.x - 8, map.y - 8, map.width + 16, map.height + 16);
  drawCover(ctx, image, map.x, map.y, map.width, map.height);

  if (focus) drawFocusBadge(ctx, map, focus, width);

  drawInfoPanel(ctx, info, plan, {
    context: context || 'A visual argument in historical streams.',
    shareContext,
    settings,
    focus
  });

  ctx.fillStyle = '#624b35'; ctx.font = `700 ${Math.round(width * .014)}px Arial, sans-serif`;
  ctx.fillText('INTERACTIVE VISUAL HISTORY  ·  HISTOMAPS.ORG', pad, height - Math.round(pad * .48));
  return plan;
}

function drawHeaderChips(ctx, plan, rangeLabel, ageLabel) {
  const labels = [rangeLabel, ageLabel].filter(Boolean);
  if (!labels.length) return;
  const { width, pad, header } = plan;
  let x = width - pad;
  const y = header - Math.round(pad * .62);
  ctx.font = `700 ${Math.round(width * .0145)}px Arial, sans-serif`;
  for (const label of labels) {
    const text = String(label).toUpperCase();
    const chipWidth = Math.min(width * .42, ctx.measureText(text).width + pad * .55);
    x -= chipWidth;
    ctx.fillStyle = '#d8c8b0'; ctx.fillRect(x, y - Math.round(pad * .31), chipWidth, Math.round(pad * .55));
    ctx.fillStyle = '#3f2e20'; ctx.fillText(text, x + pad * .26, y + Math.round(pad * .05), chipWidth - pad * .5);
    x -= Math.round(pad * .16);
  }
}

function drawFocusBadge(ctx, map, focus, width) {
  const label = `FOCUS · ${focus.label}`.toUpperCase();
  ctx.font = `800 ${Math.round(width * .013)}px Arial, sans-serif`;
  const chipWidth = Math.min(map.width * .72, ctx.measureText(label).width + width * .038);
  const chipHeight = Math.round(width * .033);
  ctx.fillStyle = 'rgba(247,241,228,.94)'; ctx.fillRect(map.x + 14, map.y + 14, chipWidth, chipHeight);
  ctx.fillStyle = focus.color || '#3f2e20'; ctx.fillRect(map.x + 14, map.y + 14, Math.max(8, width * .008), chipHeight);
  ctx.fillStyle = '#2b1d13'; ctx.fillText(label, map.x + 28 + Math.max(8, width * .008), map.y + 14 + chipHeight * .68, chipWidth - 44);
}

function drawInfoPanel(ctx, box, plan, { context, shareContext, settings, focus }) {
  const { width } = plan;
  const small = Math.round(width * (plan.horizontal ? .014 : .016));
  const body = Math.round(width * (plan.horizontal ? .016 : .018));
  const heading = Math.round(width * (plan.horizontal ? .015 : .017));
  const gap = Math.round(width * .014);

  ctx.fillStyle = '#5a493b'; ctx.font = `400 ${body}px Georgia, serif`;
  let y = box.y + body;
  y = drawTextLines(ctx, context, box.x, y, box.width, Math.round(body * 1.38), plan.horizontal ? 5 : 3) + gap;

  if (plan.horizontal) {
    if (settings.showLegend) y = drawLegend(ctx, box, y, shareContext, focus, heading, small) + gap;
    if (settings.showEvents) drawEvents(ctx, box, y, shareContext, heading, small);
    return;
  }

  const columnGap = gap * 2;
  const columnWidth = (box.width - columnGap) / 2;
  if (settings.showLegend) drawLegend(ctx, { x: box.x, y: box.y, width: columnWidth, height: box.height }, y, shareContext, focus, heading, small);
  if (settings.showEvents) drawEvents(ctx, { x: box.x + columnWidth + columnGap, y: box.y, width: columnWidth, height: box.height }, y, shareContext, heading, small);
}

function drawLegend(ctx, box, y, shareContext, focus, headingSize, smallSize) {
  const streams = (shareContext?.visibleStreams || []).slice(0, 8);
  if (!streams.length) return y;
  ctx.fillStyle = '#624b35'; ctx.font = `800 ${headingSize}px Arial, sans-serif`;
  ctx.fillText((focus ? 'EMPIRES & PEOPLES IN VIEW' : 'WHO IS IN VIEW').toUpperCase(), box.x, y);
  y += headingSize * 1.6;
  const row = smallSize * 1.55;
  streams.forEach((stream, index) => {
    if (y + row > box.y + box.height - smallSize * 2) return;
    const swatch = Math.max(9, smallSize * .72);
    ctx.fillStyle = stream.color || '#806b56'; ctx.fillRect(box.x, y - swatch * .75, swatch, swatch);
    ctx.fillStyle = stream.focused ? '#2b1d13' : '#5a493b'; ctx.font = `${stream.focused ? 800 : 600} ${smallSize}px Arial, sans-serif`;
    const suffix = index === 7 && (shareContext?.visibleStreams?.length || 0) > 8 ? `  +${shareContext.visibleStreams.length - 8} more` : '';
    ctx.fillText(`${stream.label}${suffix}`, box.x + swatch * 1.55, y, box.width - swatch * 1.7);
    y += row;
  });
  return y;
}

function drawEvents(ctx, box, y, shareContext, headingSize, smallSize) {
  const events = shareContext?.visibleEvents || [];
  if (!events.length) return y;
  ctx.fillStyle = '#624b35'; ctx.font = `800 ${headingSize}px Arial, sans-serif`; ctx.fillText('KEY EVENTS IN VIEW', box.x, y);
  y += headingSize * 1.7;
  const line = smallSize * 1.35;
  for (const event of events.slice(0, 4)) {
    const label = Number.isFinite(event.year) ? `${formatYear(event.year)} — ${event.label}` : event.label;
    ctx.fillStyle = '#4e4034'; ctx.font = `600 ${smallSize}px Arial, sans-serif`;
    y = drawTextLines(ctx, label, box.x, y, box.width, line, 2) + line * .35;
    if (y > box.y + box.height - smallSize * 2) break;
  }
  return y;
}

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  ctx.restore();
}

function drawTextLines(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let row = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + (row * lineHeight), maxWidth);
      row += 1;
      if (row >= maxLines) return y + ((row - 1) * lineHeight);
      line = word;
    } else line = candidate;
  }
  if (line && row < maxLines) {
    ctx.fillText(line, x, y + (row * lineHeight), maxWidth);
    row += 1;
  }
  return y + (Math.max(0, row - 1) * lineHeight);
}
