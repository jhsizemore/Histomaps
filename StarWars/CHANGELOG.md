# Star Wars Histomap changelog

All notable public Star Wars Histomap releases are recorded here. The interactive atlas remains canonical at https://histomaps.org/starwars/.

## 1.0.0 — 7 September 2026

First launch release.

### Atlas
- Canon political-history atlas covering 500 BBY through 35 ABY with 30 selected turning points.
- 28 mapped film and television properties on the same elastic time scale, with fixed true-date anchors, collision-managed cards, grouped shared-date titles, and explicit approximate/discontinuous spans.
- 16 canon character lifelines with independently marked births, deaths, approximate endpoints, and open last-known appearances.
- Separately labelled ancient and future Legends sections that never connect their streams to canon.
- 14 sourced faction insignia, individual title lockups, and a shared cinematic starfield across web and poster editions.
- Editorial stream widths are qualitative interpretations of political and military influence, not canonical territorial or population measurements.

### Launch experience
- Canonical lowercase route: `https://histomaps.org/starwars/`, with legacy/case-variant routes redirected to it.
- Responsive first-load introduction and map-first interaction across desktop, widescreen, phone portrait, and phone landscape.
- Streams, Films & TV, and Lifelines companion layers with focused mobile controls and reduced chrome.
- OpenGraph/Twitter metadata, share preview, creator attribution, poster download, Histomaps promotion, Patreon link, and unofficial-fan-project disclaimer.
- Source guide includes a public GitHub correction route for chronology or citation issues.

### Static and sharing outputs
- `downloads/Star-Wars-Histomap-Poster.png` — 5,200 × 18,220 master PNG.
- `downloads/Star-Wars-Histomap-Reddit-Launch.png` — 2,400 × 3,000 Reddit launch graphic.
- `assets/star-wars-histomap-social-card.png` — 1,200 × 630 social/OG card.
- `assets/star-wars-histomap-poster-preview.webp` — 900 × 3,153 lightweight poster preview.

### Final chronology QA
- Young Jedi Adventures changed from a single-year marker to an approximate discontinuous 233–222 BBY envelope to reflect later Season 3 chronology.
- Maul – Shadow Lord moved to an explicitly approximate 17 BBY schematic anchor following 2026 Lucasfilm timing language.
- The Mandalorian and Grogu moved from the old 9 ABY shared cluster to 11 ABY or later, approximate; Grogu’s open lifeline was extended with it.
- Current BBY/ABY reference dating adopted around Yavin: Andor Season 2 and Rebels principal spans end in 1 BBY; Rogue One/Scarif and pre-Yavin A New Hope events are placed in 1 BBY; the Battle of Yavin remains the zero reference point; Obi-Wan’s death is placed before Yavin in 1 BBY.

### Verification at launch
- Website ↔ poster sync audit passed: 30 events, 28 screen properties, 16 lifelines, 13 factions, 36 title-art assets, and 14 insignia assets.
- Final external-link sweep checked 148 unique URLs: 132 directly reachable, 16 access-restricted by the destination, and zero confirmed 404/410 citations.
- Live canonical page, cache-busted source files, master poster, Reddit image, social card, and web preview all returned successfully and the deployed chronology matched the launch source.
- Permanent generated-asset workflow validates source synchronization, renders all four public launch images, verifies formats/dimensions/canonical metadata, retains QA artifacts, and safely rebases generated-asset commits if `main` advances during rendering.

### Release marker
- Version file: `StarWars/VERSION`
- Machine-readable record: `StarWars/release.json`
- Snapshot ref: `release/starwars-v1.0.0`
