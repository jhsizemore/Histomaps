import { classifyAge } from './age-bands.js';
import { formatYearRange } from './year-format.js';

export function extractShareContext({
  yearStart,
  yearEnd,
  streams = [],
  events = [],
  focusedStreamId = null,
  focusedStreamLabel = null
} = {}) {
  const low = Number.isFinite(yearStart) ? yearStart : null;
  const high = Number.isFinite(yearEnd) ? yearEnd : null;
  const visibleStreams = [...streams]
    .filter((stream) => stream && stream.visible !== false && stream.label)
    .map((stream) => ({ ...stream, prominence: Number.isFinite(stream.prominence) ? stream.prominence : 0 }))
    .sort((a, b) => b.prominence - a.prominence || a.label.localeCompare(b.label));

  let focusStream = null;
  if (focusedStreamId) focusStream = visibleStreams.find((stream) => stream.id === focusedStreamId) || null;
  if (!focusStream && focusedStreamLabel) {
    const target = normalize(focusedStreamLabel);
    focusStream = visibleStreams.find((stream) => normalize(stream.label) === target) || null;
  }

  if (!focusStream && focusedStreamLabel) {
    focusStream = { id: focusedStreamId || slugify(focusedStreamLabel), label: focusedStreamLabel, prominence: 1, focused: true };
    visibleStreams.unshift(focusStream);
  }

  if (focusStream) {
    focusStream.focused = true;
    const index = visibleStreams.indexOf(focusStream);
    if (index > 0) visibleStreams.unshift(visibleStreams.splice(index, 1)[0]);
  }

  const visibleEvents = [...events]
    .filter((event) => event && event.label && (low === null || !Number.isFinite(event.year) || event.year >= low) && (high === null || !Number.isFinite(event.year) || event.year <= high))
    .sort((a, b) => eventScore(b, focusStream, low, high) - eventScore(a, focusStream, low, high))
    .slice(0, focusStream ? 4 : 3);

  const age = low !== null && high !== null ? classifyAge(low, high) : null;
  const yearRange = low !== null && high !== null ? {
    start: Math.min(low, high),
    end: Math.max(low, high),
    spanYears: Math.max(1, Math.abs(high - low)),
    label: formatYearRange(low, high)
  } : null;

  return {
    yearRange,
    age,
    focusStreamId: focusStream?.id || null,
    focusStream,
    visibleStreams,
    visibleEvents,
    mode: focusStream ? 'focus' : 'overview'
  };
}

export function defaultShareCopy(context, mapTitle = 'Histomap: The World') {
  const focus = context?.focusStream;
  const neighbors = (context?.visibleStreams || []).filter((stream) => !focus || stream.id !== focus.id).slice(0, 3).map((stream) => stream.label);
  const age = context?.age?.label;
  const yearRange = context?.yearRange?.label || 'World history';
  const title = focus?.label || mapTitle;
  const timeframe = yearRange;

  const parts = [];
  if (age) parts.push(age);
  if (focus && neighbors.length) parts.push(`Seen alongside ${naturalList(neighbors)}.`);
  else if (neighbors.length) parts.push(`Featuring ${naturalList(neighbors)}.`);
  else if (focus) parts.push(`A focused view of ${focus.label}.`);
  else parts.push('A visual argument in historical streams.');

  return { title, timeframe, context: parts.join('. ').replace(/\.\./g, '.') };
}

function eventScore(event, focus, low, high) {
  let score = Number.isFinite(event.importance) ? event.importance : 0;
  if (focus && (event.streamId === focus.id || normalize(event.streamLabel) === normalize(focus.label))) score += 100;
  if (Number.isFinite(event.year) && Number.isFinite(low) && Number.isFinite(high)) {
    const midpoint = Math.min(low, high) + (Math.abs(high - low) / 2);
    score += Math.max(0, 20 - Math.abs(event.year - midpoint) / Math.max(1, Math.abs(high - low) / 20));
  }
  return score;
}

function naturalList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'focused-stream';
}
