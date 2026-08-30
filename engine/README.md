# Histomap Engine

This directory is the reusable foundation for Histomaps.org models. It does not replace the current public World build; that build remains a production reference until it can be migrated from the readable development master.

The engine separates three concerns:

- **Model data** — the historical argument, streams, events, people, eras and sources.
- **Engine** — validation and deterministic geometry/layout primitives.
- **Presentation** — a model's theme, controls and view-specific rendering.

## First public contract

`schema/histomap-model.schema.json` is the portable JSON contract. It is intentionally strict about IDs, chronology, declared stream metrics and source references, but it leaves historical interpretation to each model.

`src/` exposes small dependency-free modules:

- `validate-model.js` checks the contract and cross-references.
- `stream-geometry.js` interpolates authored stream cross-sections and keeps automatic layout separate from editorial overrides.
- `share-card.js` provides the reusable branded-card layouts used by model-specific share composers.

## Working with a model

1. Copy `models/_template/model.json`.
2. State the model's thesis and stream-width metric in `metadata`.
3. Add sources before using a source ID on an event, person or stream.
4. Run `node tools/validate-model.mjs models/<model>/model.json`.
5. Use the output as input to a renderer. A renderer must not mutate model data.

## Design constraints

- A Histomap is a visual argument, not an allegedly neutral timeline.
- Width always has a model-declared meaning; it is never implicitly “power.”
- Streams may split, merge, disappear, overlap or be non-zero-sum.
- Author-supplied geometry overrides automatic placement.
- Uncertainty and provenance belong in the model data, rather than only in UI copy.
