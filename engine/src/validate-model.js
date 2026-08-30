const ID = /^[a-z][a-z0-9-]*$/;

export function validateModel(model) {
  const errors = [];
  const fail = (path, message) => errors.push({ path, message });
  const required = (value, path) => { if (value === undefined || value === null || value === '') fail(path, 'is required'); };
  required(model?.schemaVersion, 'schemaVersion');
  if (model?.schemaVersion !== '1.0') fail('schemaVersion', 'must be "1.0"');
  const metadata = model?.metadata || {};
  ['id', 'title', 'thesis', 'streamWidthMetric'].forEach((key) => required(metadata[key], `metadata.${key}`));
  required(metadata.time?.minYear, 'metadata.time.minYear'); required(metadata.time?.maxYear, 'metadata.time.maxYear'); required(metadata.time?.calendar, 'metadata.time.calendar');
  if (metadata.time?.minYear > metadata.time?.maxYear) fail('metadata.time', 'minYear must not exceed maxYear');
  const ids = new Map();
  const collect = (items, kind) => (items || []).forEach((item, index) => { const path = `${kind}[${index}].id`; if (!ID.test(item?.id || '')) fail(path, 'must be lowercase kebab-case'); if (ids.has(item?.id)) fail(path, `duplicates ${ids.get(item.id)}`); else ids.set(item?.id, `${kind}[${index}]`); });
  collect(model?.sources, 'sources'); collect(model?.streams, 'streams'); collect(model?.events, 'events'); collect(model?.people, 'people'); collect(model?.eras, 'eras');
  const sourceIds = new Set((model?.sources || []).map(({ id }) => id)); const streamIds = new Set((model?.streams || []).map(({ id }) => id));
  const requireSources = (item, path) => { if (!item?.sourceIds?.length) fail(`${path}.sourceIds`, 'must name at least one source'); (item?.sourceIds || []).forEach((id) => { if (!sourceIds.has(id)) fail(`${path}.sourceIds`, `references missing source "${id}"`); }); };
  (model?.streams || []).forEach((stream, index) => { const path = `streams[${index}]`; requireSources(stream, path); if (!stream.segments?.length) fail(`${path}.segments`, 'must have at least one cross-section'); let previousYear = -Infinity; (stream.segments || []).forEach((segment, segmentIndex) => { if (!Number.isFinite(segment.year) || !Number.isFinite(segment.center) || !Number.isFinite(segment.width)) fail(`${path}.segments[${segmentIndex}]`, 'year, center and width must be numeric'); if (segment.width < 0) fail(`${path}.segments[${segmentIndex}].width`, 'must not be negative'); if (segment.year <= previousYear) fail(`${path}.segments`, 'years must be strictly increasing'); previousYear = segment.year; }); (stream.parentStreamIds || []).forEach((id) => { if (!streamIds.has(id)) fail(`${path}.parentStreamIds`, `references missing stream "${id}"`); }); });
  (model?.events || []).forEach((event, index) => { const path = `events[${index}]`; requireSources(event, path); if (!Number.isFinite(event.year)) fail(`${path}.year`, 'must be numeric'); if (event.endYear !== undefined && event.endYear < event.year) fail(`${path}.endYear`, 'must not precede year'); if (event.streamId && !streamIds.has(event.streamId)) fail(`${path}.streamId`, `references missing stream "${event.streamId}"`); });
  (model?.people || []).forEach((person, index) => { const path = `people[${index}]`; requireSources(person, path); if (person.deathYear < person.birthYear) fail(path, 'deathYear must not precede birthYear'); });
  (model?.eras || []).forEach((era, index) => { if (era.endYear < era.startYear) fail(`eras[${index}]`, 'endYear must not precede startYear'); });
  return { valid: errors.length === 0, errors };
}
