/** Return an authored stream cross-section at a year. */
export function sampleStream(stream, year) {
  const samples = [...stream.segments].sort((a, b) => a.year - b.year);
  if (!samples.length) return null;
  if (year <= samples[0].year) return crossSection(samples[0], samples[0].locked);
  if (year >= samples.at(-1).year) return crossSection(samples.at(-1), samples.at(-1).locked);
  const afterIndex = samples.findIndex((sample) => sample.year >= year);
  const before = samples[afterIndex - 1];
  const after = samples[afterIndex];
  const progress = (year - before.year) / (after.year - before.year);
  return crossSection({ year, center: before.center + ((after.center - before.center) * progress), width: before.width + ((after.width - before.width) * progress) }, Boolean(before.locked || after.locked));
}

function crossSection(sample, locked) {
  const halfWidth = sample.width / 2;
  return { year: sample.year, center: sample.center, width: sample.width, top: sample.center - halfWidth, bottom: sample.center + halfWidth, locked };
}
