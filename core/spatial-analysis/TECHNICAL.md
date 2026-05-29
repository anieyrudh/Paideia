# Spatial Analysis · Technical Record

## Public Interface Summary

`@paideia/spatial-analysis` exports planar point, segment, and polygon types
plus pure helpers for:

- `polygonArea`
- `polygonCentroid`
- `polygonMetrics`
- `pointInPolygon`
- `distanceBetweenPoints`
- `distancePointToSegment`
- `circularBuffer`
- `polygonsAdjacent`
- `visibilityBetween`

The package owns small deterministic planar geometry. It does not own
geographic projection, map scenes, spatial indexing, or rendering.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Points have exactly two finite coordinates | `point2D` and validators return `out-of-domain` or `precondition-violated` |
| Polygons have at least three points | `validatePolygon` returns `precondition-violated` |
| Degenerate polygons have no centroid | `polygonMetrics` returns `precondition-violated` |
| Line segments have distinct endpoints | `lineSegment2D` returns `precondition-violated` |
| Buffer radius is finite and non-negative | `circularBuffer` returns `out-of-domain` |
| Buffer segment count is an integer >= 8 | `circularBuffer` returns `precondition-violated` |
| Visibility obstacles are valid polygons | `visibilityBetween` validates each obstacle |
| Derived values stay finite | Derived-value guards return `numerical-instability` |
| Caller-owned inputs are not mutated | Tests compare behavior through frozen outputs and no in-place writes |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No GIS, projection, spatial-index, rendering, or GPL-family runtime
  dependencies are bundled.

## Test Strategy

- Happy paths cover polygon metrics, containment, distances, buffers,
  adjacency, visibility, and centroid extraction.
- Error paths cover `out-of-domain` and `precondition-violated`.
- Property-style checks verify polygon area invariance under vertex rotation.
- Immutability checks confirm buffer and result records are frozen.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could sprawl into a GIS engine or map runtime. Resolved by keeping this
  package planar and delegating geographic projection/layers to
  `@paideia/map-layers`.
- Degenerate polygons could leak invalid centroids or areas. Resolved through
  explicit non-zero-area validation.

### P1 issues

- Boundary behavior in containment and visibility can be ambiguous. Resolved by
  returning `"boundary"` from `pointInPolygon` and by exposing
  `allowBoundaryTouch` in visibility.
- Buffer outputs could be mistaken for exact offsets. Resolved by naming
  `circularBuffer` an approximation and requiring explicit segment counts for
  higher resolution.

### High-bandwidth questions surfaced

- If a future container needs holes, multipolygons, or spatial indexes, those
  should be separate contracts rather than hidden complexity in this kernel.

## P2 Followups

- Add polygon-with-holes support only when a container specifically needs hole
  semantics.
- Add bounding-box or grid-index acceleration only through a separate contract
  if queue items need large obstacle sets.
