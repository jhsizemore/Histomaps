# Histomap Engine Extraction Brief

## Status

The public `/world/` application is an intentionally frozen, minified production artifact. It is the visual and interaction reference, but not the migration source. New engine work must not edit it directly.

## What is shared

- A time-oriented stream field with stream selection, focus and navigation.
- Stream cross-sections that can grow, shrink, split, merge and end.
- Events, people/lifelines, eras and contextual cards.
- Semantic zoom, minimap, deep links, keyboard support and reduced motion.
- Responsive presentation, including the stream-forward mobile experience.
- Provenance and confidence surfaced with the content they support.

## What belongs to a model

- Thesis, chronology, source base and definitions.
- Stream-width metric and any non-zero-sum interpretation.
- Stream taxonomy and authored geometry.
- Theme, imagery, terminology and optional overlays.
- Editorial decisions about uncertainty and emphasis.

## First migration

1. Obtain the readable World development master.
2. Export its stream, event, person and era arrays into `models/world/model.json`.
3. Preserve stable IDs and source links during export.
4. Validate the exported model in CI and locally with `tools/validate-model.mjs`.
5. Build an adapter that renders the World model using existing production interactions before replacing any World route.

## Proof model

The United States map is the first full engine proof. It must work through the same schema without treating political history as the only kind of stream or requiring World-specific rendering paths.
