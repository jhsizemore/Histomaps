from pathlib import Path
p=Path('StarWars/tools/poster/audit-data-sync.js')
s=p.read_text()
s=s.replace("const syncKeys = ['height', 'anchors', 'eras', 'sources', 'factions', 'states', 'events', 'screen', 'undatedScreen', 'legends'];", "const syncKeys = ['height', 'anchors', 'eras', 'factions', 'states', 'events', 'screen', 'undatedScreen', 'legends'];")
needle="""for (const life of poster.lifelines || []) {
  const live = webLifeById.get(life.id);
  if (!live) differences.push(`lifelines.${life.id}: featured poster life missing on web`);
  else diff(live, life, `lifelines.${life.id}`, differences);
}
"""
insert=needle+"""// Website-only recurring characters also add source links. The poster source shelf is
// likewise a curated subset, but every source it does carry must stay byte-for-byte synced.
for (const [key, value] of Object.entries(poster.sources || {})) {
  if (!(key in (web.sources || {}))) differences.push(`sources.${key}: poster source missing on web`);
  else diff(web.sources[key], value, `sources.${key}`, differences);
}
"""
if 'poster source missing on web' not in s:
    assert needle in s
    s=s.replace(needle,insert)
p.write_text(s)
print('Lifeline/source subset audit fixed')
