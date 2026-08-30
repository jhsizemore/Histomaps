import { parseHistoricalYear } from '../src/year-format.js';

const STREAM_SELECTORS = [
  '[data-stream-id]', '[data-stream]', '.stream-label', '.streamLabel', '.hm-stream-label', '.stream-name', '.streamName'
];
const EVENT_SELECTORS = [
  '[data-event-id]', '[data-event]', '.event-label', '.eventLabel', '.event-marker', '.eventMarker'
];
const FOCUS_SELECTORS = [
  '[data-stream-id][aria-current="true"]', '[data-stream-id][data-selected="true"]', '[data-stream-id].selected', '[data-stream-id].active', '[data-stream-id].focused',
  '[data-stream][aria-current="true"]', '[data-stream][data-selected="true"]', '[data-stream].selected', '[data-stream].active', '[data-stream].focused',
  '.stream-label.selected', '.stream-label.active', '.stream-label.focused', '.streamLabel.selected', '.streamLabel.active', '.streamLabel.focused'
];

export function readWorldShareContext(root = document) {
  const map = root.querySelector('#histomap') || root.querySelector('svg');
  if (!map) return { streams: [], events: [] };

  const years = collectVisibleYears(map);
  const focus = detectFocus(root, map);
  const streams = collectVisibleStreams(map, focus);
  const events = collectVisibleEvents(map, streams);

  return {
    yearStart: years.length ? Math.min(...years) : null,
    yearEnd: years.length ? Math.max(...years) : null,
    streams,
    events,
    focusedStreamId: focus?.id || null,
    focusedStreamLabel: focus?.label || null
  };
}

function collectVisibleYears(map) {
  const years = [];
  for (const element of map.querySelectorAll('[data-year],[data-start-year],[data-end-year],text')) {
    if (!intersectsViewport(element)) continue;
    for (const value of [element.dataset?.year, element.dataset?.startYear, element.dataset?.endYear]) {
      const parsed = parseHistoricalYear(value);
      if (Number.isFinite(parsed)) years.push(parsed);
    }
    if (element.tagName?.toLowerCase() === 'text') {
      const parsed = parseHistoricalYear(element.textContent);
      if (Number.isFinite(parsed)) years.push(parsed);
    }
  }

  if (years.length >= 2) return dedupe(years);

  const focusValue = document.querySelector('#focusNumber')?.value || document.querySelector('.focus-pill strong')?.textContent;
  const focusYear = parseHistoricalYear(focusValue);
  if (Number.isFinite(focusYear)) years.push(focusYear);
  return dedupe(years);
}

function detectFocus(root, map) {
  for (const selector of FOCUS_SELECTORS) {
    const element = root.querySelector(selector) || map.querySelector(selector);
    if (!element) continue;
    const result = streamFromElement(element);
    if (result?.label || result?.id) return result;
  }

  const explicit = root.body?.dataset?.focusedStream || root.documentElement?.dataset?.focusedStream;
  if (explicit) return { id: slugify(explicit), label: explicit };

  const hash = decodeURIComponent(location.hash || '').replace(/^#/, '');
  const hashMatch = hash.match(/(?:stream|focus)[=:/-]([^&/]+)/i);
  if (hashMatch) return { id: slugify(hashMatch[1]), label: humanize(hashMatch[1]) };
  return null;
}

function collectVisibleStreams(map, focus) {
  const byId = new Map();
  for (const selector of STREAM_SELECTORS) {
    for (const element of map.querySelectorAll(selector)) addStreamCandidate(byId, element, focus, true);
  }

  if (byId.size < 3) {
    for (const text of map.querySelectorAll('text')) addStreamCandidate(byId, text, focus, false);
  }

  const streams = [...byId.values()]
    .filter((stream) => stream.label && !looksLikeUi(stream.label) && parseHistoricalYear(stream.label) === null)
    .sort((a, b) => b.prominence - a.prominence || a.label.localeCompare(b.label));

  if (focus && !streams.some((stream) => sameStream(stream, focus))) {
    streams.unshift({ id: focus.id || slugify(focus.label), label: focus.label || humanize(focus.id), color: focus.color || '#493526', prominence: 999, focused: true, visible: true });
  }
  return streams.slice(0, 16);
}

function addStreamCandidate(byId, element, focus, explicit) {
  if (!intersectsViewport(element)) return;
  const label = streamLabel(element);
  if (!label || label.length > 52 || looksLikeEventSentence(label)) return;
  const id = streamId(element) || slugify(label);
  if (!id) return;
  const style = getComputedStyle(element);
  const rect = safeRect(element);
  const fontSize = parseFloat(style.fontSize) || 10;
  const area = Math.max(1, rect.width * rect.height);
  const prominence = (explicit ? 80 : 0) + Math.min(70, fontSize * 2) + Math.min(80, Math.sqrt(area));
  const current = byId.get(id);
  const candidate = {
    id,
    label: cleanLabel(label),
    color: readableColor(style.fill || style.color || element.getAttribute?.('fill')),
    prominence,
    focused: focus ? sameStream({ id, label }, focus) : false,
    visible: true
  };
  if (!current || candidate.prominence > current.prominence) byId.set(id, candidate);
}

function collectVisibleEvents(map, streams) {
  const events = [];
  const seen = new Set();
  for (const selector of EVENT_SELECTORS) {
    for (const element of map.querySelectorAll(selector)) {
      if (!intersectsViewport(element)) continue;
      const label = cleanLabel(element.dataset?.title || element.getAttribute?.('aria-label') || element.textContent || '');
      if (!label || seen.has(label)) continue;
      const year = parseHistoricalYear(element.dataset?.year) ?? parseHistoricalYear(label);
      const parentStream = closestStream(element, streams);
      events.push({
        id: element.dataset?.eventId || element.dataset?.event || slugify(label),
        label,
        year: Number.isFinite(year) ? year : null,
        streamId: parentStream?.id || element.dataset?.streamId || null,
        streamLabel: parentStream?.label || null,
        importance: 20
      });
      seen.add(label);
    }
  }
  return events.slice(0, 12);
}

function closestStream(element, streams) {
  const parent = element.closest?.('[data-stream-id],[data-stream]');
  const id = parent ? streamId(parent) : null;
  if (id) return streams.find((stream) => stream.id === id) || null;
  return null;
}

function streamFromElement(element) {
  const style = getComputedStyle(element);
  return {
    id: streamId(element) || slugify(streamLabel(element)),
    label: streamLabel(element) || humanize(streamId(element)),
    color: readableColor(style.fill || style.color || element.getAttribute?.('fill'))
  };
}

function streamId(element) {
  return element?.dataset?.streamId || element?.dataset?.stream || element?.getAttribute?.('data-id') || null;
}

function streamLabel(element) {
  return cleanLabel(element?.dataset?.label || element?.dataset?.name || element?.getAttribute?.('aria-label') || element?.textContent || '');
}

function sameStream(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && slugify(a.id) === slugify(b.id)) return true;
  return normalize(a.label) && normalize(a.label) === normalize(b.label);
}

function intersectsViewport(element) {
  const rect = safeRect(element);
  if (!rect.width && !rect.height) return false;
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= height && rect.left <= width;
}

function safeRect(element) {
  try { return element.getBoundingClientRect(); }
  catch { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
}

function readableColor(value) {
  if (!value || value === 'none' || /rgba?\(0, 0, 0, 0\)/.test(value)) return '#6b5847';
  return value;
}

function looksLikeUi(label) {
  return /^(zoom|search|about|menu|close|back|next|previous|share|explore|focus|year|events?|people|eras?|world histomap)$/i.test(label.trim());
}

function looksLikeEventSentence(label) {
  return label.length > 34 && /\b(war|battle|founded|falls?|dies?|born|conquer|revolt|treaty|declares?|begins?|ends?)\b/i.test(label);
}

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return cleanLabel(value).toLowerCase();
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function humanize(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dedupe(values) {
  return [...new Set(values.filter(Number.isFinite))];
}
