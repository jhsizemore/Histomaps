export const AGE_BANDS = Object.freeze([
  { id: 'bronze-age', label: 'Bronze Age', start: -3300, end: -1200, sourceUrl: 'https://en.wikipedia.org/wiki/Bronze_Age' },
  { id: 'iron-age', label: 'Iron Age', start: -1200, end: -600, sourceUrl: 'https://en.wikipedia.org/wiki/Iron_Age' },
  { id: 'classical-antiquity', label: 'Classical Antiquity', start: -800, end: 500, sourceUrl: 'https://en.wikipedia.org/wiki/Classical_antiquity' },
  { id: 'late-antiquity', label: 'Late Antiquity', start: 250, end: 750, sourceUrl: 'https://en.wikipedia.org/wiki/Late_antiquity' },
  { id: 'early-middle-ages', label: 'Early Middle Ages', start: 500, end: 1000, sourceUrl: 'https://en.wikipedia.org/wiki/Early_Middle_Ages' },
  { id: 'high-middle-ages', label: 'High Middle Ages', start: 1000, end: 1300, sourceUrl: 'https://en.wikipedia.org/wiki/High_Middle_Ages' },
  { id: 'late-middle-ages', label: 'Late Middle Ages', start: 1300, end: 1500, sourceUrl: 'https://en.wikipedia.org/wiki/Late_Middle_Ages' },
  { id: 'early-modern-period', label: 'Early Modern Period', start: 1500, end: 1800, sourceUrl: 'https://en.wikipedia.org/wiki/Early_modern_period' },
  { id: 'long-nineteenth-century', label: 'Long Nineteenth Century', start: 1789, end: 1914, sourceUrl: 'https://en.wikipedia.org/wiki/Long_nineteenth_century' },
  { id: 'modern-era', label: 'Modern Era', start: 1914, end: 1991, sourceUrl: 'https://en.wikipedia.org/wiki/Modern_era' },
  { id: 'contemporary-history', label: 'Contemporary History', start: 1945, end: 2100, sourceUrl: 'https://en.wikipedia.org/wiki/Contemporary_history' }
]);

function overlap(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

export function classifyAge(start, end, bands = AGE_BANDS) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const span = Math.max(1, high - low);
  const midpoint = low + (span / 2);

  const ranked = bands
    .map((age) => {
      const amount = overlap(low, high, age.start, age.end);
      const containsMidpoint = midpoint >= age.start && midpoint <= age.end;
      return { ...age, overlap: amount, share: amount / span, containsMidpoint };
    })
    .filter((age) => age.overlap > 0)
    .sort((a, b) => (b.share - a.share) || (Number(b.containsMidpoint) - Number(a.containsMidpoint)) || ((a.end - a.start) - (b.end - b.start)));

  if (!ranked.length) return null;
  const primary = ranked[0];
  const secondary = ranked.find((age) => age.id !== primary.id && age.share >= 0.25);

  if (secondary && primary.share < 0.78) {
    const ordered = [primary, secondary].sort((a, b) => a.start - b.start);
    return {
      type: 'transition',
      label: `${ordered[0].label} → ${ordered[1].label}`,
      primary,
      secondary,
      sourceUrls: [ordered[0].sourceUrl, ordered[1].sourceUrl]
    };
  }

  return {
    type: 'single',
    label: primary.label,
    primary,
    secondary: null,
    sourceUrls: [primary.sourceUrl]
  };
}
