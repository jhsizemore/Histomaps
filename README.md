# Histomaps.org

**History, seen in streams.**

Histomaps.org is a publishing project for visual historical arguments. A Histomap treats historical subjects as continuous streams through time, allowing scale, continuity, transformation, contemporaneity, people and events to be read together.

## Public website

- `/` — Histomaps.org project homepage
- `/world/` — interactive World Histomap public preview
- `/about/` — format, provenance and methodology
- `/journal/a-histomap-is-an-argument/` — project manifesto / launch essay
- `/assets/` — shared website and brand assets

## World Histomap production

`/world/` is a frozen, static production build. The readable development master and deployment patch scaffolding are intentionally not kept on the current public branch. HTML, CSS and JavaScript are minified for deployment; development should continue from the readable private master rather than from the production artifact.

## Histomap Engine

`engine/` and `models/` provide the beginning of a reusable Histomap engine:
a versioned model contract, source-aware validation and deterministic stream
geometry primitives. The current World map remains the reference model; its
minified public build is not modified by this foundation work. See
[`engine/README.md`](engine/README.md) and
[`docs/engine-extraction-brief.md`](docs/engine-extraction-brief.md).

## Attribution

The project begins with John B. Sparks's 1931 *The Histomap: Four Thousand Years of World History*. Histomaps.org is an independent interactive implementation and extension of the visual format by J. Hunter Sizemore.

Implementation and original editorial work © 2026 J. Hunter Sizemore.
