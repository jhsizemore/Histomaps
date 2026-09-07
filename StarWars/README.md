# Star Wars Histomap

Canonical public route: `https://histomaps.org/starwars/`. The retained `StarWars/` directory is an internal deployment source; Cloudflare Pages redirects legacy/case-variant public routes and proxies the lowercase route to these static assets.

**Launch release:** `v1.0.0` · 7 September 2026. The launch snapshot is identified by the dedicated `release/starwars-v1.0.0` ref. See [`CHANGELOG.md`](CHANGELOG.md), [`VERSION`](VERSION), and [`release.json`](release.json) for the release record.

`index.html`, `styles.css`, and `app.js` provide the interactive map. `data.js` contains the core canon model; `expanded-data.js` contains synchronized screen-story spans and the separately labeled ancient and future Legends sections. `lifelines.js` contains the 16 featured biological lifelines used by the website and static poster; `recurring-lifelines.js` adds 78 screen-recurring characters to the interactive layer, for 94 selectable characters total, with explicit qualifying property lists and filter groups. `insignia.js` embeds the 14 sourced faction symbols used in the streams, faction records, and Guide; `insignia-credits.json` retains the original asset attributions. The browser app itself requires no package installation or runtime build step.

The responsive map fits its viewport and uses on-demand navigation and record drawers. Streams, Films & TV, and Lifelines select a companion track; Focus reduces interface chrome. Numbered event markers retain the full event records and three detail levels.

The screen column uses the same date-to-height function as the map. Shared-year titles expand from grouped cards, while overlapping series retain separate span lines. Exact-year markers do not imply year-long durations. Approximate and anthology windows are marked. Titles with unresolved or disconnected spans are explained in the reading guide.

Lifelines use the same time scale and are shown in compact character batches. The 16 featured records use known birth/death or last-known dates where available. The 78 expanded recurring-character records qualify through at least three mapped screen properties and use a diamond for first mapped screen appearance rather than inventing a birth date. Filled circles mean birth, crosses confirmed death, open circles last mapped appearance, and upward chevrons a birth before the map. The static poster deliberately retains only the 16 featured lives for legibility.

Legends is an alternate continuity. Its maps cover selected periods outside the core canon atlas (500 BBY–35 ABY), without claiming that canon contains no history in those periods. Legends streams never connect to canon streams. All band widths are qualitative editorial interpretations, not territory or population statistics.

Sources are linked in the map. Story spoilers are included. Star Wars belongs to Lucasfilm; this is an unofficial fan atlas.

## Creator and poster

Created by **J. Hunter Sizemore / Kliawota Disaen** — [kliawota.design](https://kliawota.design). Discover [more Histomaps](https://histomaps.org/) or [support the project on Patreon](https://patreon.com/histomaps).

The header and Guide link to `downloads/Star-Wars-Histomap-Poster.png`, the full-resolution 5,200 × 18,220 PNG. This static edition includes the creator credit, interactive atlas URL, promotional links, and all faction insignia. The download is a same-origin static file, with no sign-in required on histomaps.org. The image is downloaded on request and is not loaded with the map.

Original atlas design and editorial work © 2026 J. Hunter Sizemore. Star Wars belongs to Lucasfilm; insignia retain their source credits and licenses.

## Starfield edition

The map and full-resolution poster share `assets/starfield.webp`, an original cinematic starfield. Stars remain stationary behind the map; controls and text cards retain dark reading surfaces. The native poster renderer and its inputs are retained in `tools/poster/`.

## Launch assets

The launch-ready sharing set is generated from the same atlas source and retained in the public Star Wars tree:

- `downloads/Star-Wars-Histomap-Poster.png` — 5,200 × 18,220 PNG, approximately 8.3 MB. This is the complete static edition and the correct file for full-resolution viewing, downloading, zooming, and archival sharing.
- `downloads/Star-Wars-Histomap-Reddit-Launch.png` — 2,400 × 3,000 PNG, approximately 1.2 MB. This is the native Reddit launch image: an editorial hero plus three magnified, visually verified timeline excerpts covering the Fall of the Jedi/Reign of Empire, Age of Rebellion, and New Republic/First Order. It points readers to the complete poster and interactive atlas.
- `assets/star-wars-histomap-social-card.png` — 1,200 × 630 PNG, approximately 291 KB. This is the OpenGraph/Twitter large-image card used when the canonical page is shared.
- `assets/star-wars-histomap-poster-preview.webp` — 900 × 3,153 WebP, approximately 281 KB. This is a lightweight full-poster preview for web embeds and places where the 8.3 MB master would be unnecessarily heavy.

The canonical Star Wars page includes OpenGraph and summary-large-image metadata for `https://histomaps.org/starwars/`, pointing to the 1,200 × 630 social card.

## Generated asset pipeline

`.github/workflows/starwars-generated-assets.yml` is the permanent build and verification pipeline for the complete launch set. It runs the website↔poster data audit, validates the interactive JavaScript, renders the 5,200 × 18,220 poster, renders the Reddit launch image, social card, and lightweight web preview, and verifies file dimensions, formats, size constraints, and canonical URL metadata.

Changes to the app shell (`index.html`, `app.js`), timeline data, featured or recurring lifelines, insignia, title art, the starfield, poster inputs, either renderer, or the workflow itself trigger the pipeline. Every run retains all four generated outputs as short-lived QA artifacts for visual inspection. Pull requests never write generated binaries back to the branch. Pushes to `main` commit generated assets only when the rendered files actually differ, rebasing safely if `main` advances during rendering. The workflow can also be run manually with `workflow_dispatch`.
