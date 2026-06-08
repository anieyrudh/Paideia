# core/map-layers · Technical Record

## Public Interface

`@paideia/map-layers` exports geospatial coordinate, bounds, feature, layer, and
scene types plus pure helpers for validation, Web Mercator projection, viewport
fitting, feature bounds, layer sorting, and scene bounds.

No browser, DOM, tile-provider, or map SDK dependency is imported.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Latitude and longitude are finite and in range | `geoCoordinate()` |
| Bounds are finite, in range, and non-antimeridian | `geoBounds()` |
| Web Mercator latitude stays within projection domain | `webMercatorProject()` |
| Map sizes are finite and positive | `fitViewport()` via `validateSize()` |
| Feature and layer ids are non-empty trimmed strings | `validateFeature()` and `validateLayer()` |
| Lines have at least two coordinates | `validateFeature()` |
| Polygons have at least one ring with at least three coordinates per ring | `validateFeature()` |
| Layer ids are unique when ordered | `sortLayers()` |
| Inputs are not mutated | sorting regression test |

## Local Review Fixes

- P0: `validateFeature()` could fail open for an unknown runtime
  `geometry.kind`. Resolution: the default branch now returns
  `KernelResult.err("out-of-domain", ...)` and a regression test covers the
  invalid shape.
- P1: `webMercatorUnproject()` accepted normalized-world points outside
  `[0, 1]`, which could produce latitudes outside the projection domain.
  Resolution: unprojection now rejects non-normalized points before computing
  coordinates.

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime geospatial, tile, DOM, or browser package is bundled.

## P2 Followups

- Add `core/map-layers` to `docs/core-modules.md` as implemented during the
  next docs catalogue refresh.
- Add antimeridian-aware bounds only after a concrete container needs it and an
  ADR defines the semantics.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: a map kernel could silently wrap or clip invalid coordinates, making
  geographic visuals lie. Resolution: invalid coordinates, unsupported
  antimeridian bounds, and out-of-domain Mercator latitudes return
  `KernelResult.err(...)`.

### P1 issues

- Risk: importing a map SDK into core would add provider, attribution, network,
  and bundle concerns before a consumer needs them. Resolution: this package is
  pure data/projection logic with no map SDK dependency.

### High-bandwidth questions surfaced

- When the first real map simulation lands, decide whether it needs
  antimeridian wrapping, tile attribution helpers, or a renderer package
  separate from this pure kernel.

## Iteration log

- Kept the v0 scope pure and renderer-agnostic.
- Rejected Leaflet/Mapbox/deck.gl dependencies for this foundational PR.
- Added property tests for Web Mercator round-tripping and edge-case tests for
  bounds, features, layer ordering, and scene bounds.
