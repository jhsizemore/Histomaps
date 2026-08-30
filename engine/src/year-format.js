export function formatYear(year) {
  if (!Number.isFinite(year)) return '';
  const rounded = Math.round(year);
  if (rounded < 0) return `${Math.abs(rounded)} BCE`;
  if (rounded === 0) return '1 BCE / 1 CE';
  return `${rounded} CE`;
}

export function formatYearRange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  return low === high ? formatYear(low) : `${formatYear(low)} – ${formatYear(high)}`;
}

export function parseHistoricalYear(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return null;
  const text = String(value).trim().replace(/,/g, '');
  const eraMatch = text.match(/(?:^|\b)(\d{1,4})\s*(BCE|BC|CE|AD)(?:\b|$)/i);
  if (eraMatch) {
    const n = Number(eraMatch[1]);
    return /BCE|BC/i.test(eraMatch[2]) ? -n : n;
  }
  const signed = text.match(/^\s*(-?\d{1,4})\s*$/);
  return signed ? Number(signed[1]) : null;
}
