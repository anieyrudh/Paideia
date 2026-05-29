# core/spatial-analysis - agent contract

## What this module is

Pure planar spatial-analysis kernels for teaching polygon area, centroid,
point-in-polygon classification, Euclidean distance, simple circular buffer
approximations, polygon adjacency, and line-of-sight visibility. It returns
deterministic numbers and readonly records only; GIS projections, spatial
indexes, map rendering, topology engines, and network fetching live elsewhere.

## Public interface

Exports from `@paideia/spatial-analysis`:

- `spatialAnalysisTolerance: { default: number; tight: number; loose: number }`
- `Point2D = readonly [x: number, y: number]`
- `LineSegment2D = { start: Point2D; end: Point2D }`
- `Polygon2D = readonly Point2D[]`
- `PointInPolygonResult = "inside" | "outside" | "boundary"`
- `PolygonMetrics = { signedArea: number; area: number; centroid: Point2D; orientation: "clockwise" | "counterclockwise" }`
- `BufferInput = { center: Point2D; radius: number; segments?: number }`
- `VisibilityInput = { segment: LineSegment2D; obstacles: readonly Polygon2D[]; allowBoundaryTouch?: boolean }`
- `VisibilityResult = { visible: boolean; blockingObstacleIndex?: number }`
- `point2D(x: number, y: number): KernelResult<Point2D>`
- `lineSegment2D(start: Point2D, end: Point2D): KernelResult<LineSegment2D>`
- `polygonArea(polygon: Polygon2D): KernelResult<number>`
- `polygonCentroid(polygon: Polygon2D): KernelResult<Point2D>`
- `polygonMetrics(polygon: Polygon2D): KernelResult<PolygonMetrics>`
- `pointInPolygon(point: Point2D, polygon: Polygon2D): KernelResult<PointInPolygonResult>`
- `distanceBetweenPoints(a: Point2D, b: Point2D): KernelResult<number>`
- `distancePointToSegment(point: Point2D, segment: LineSegment2D): KernelResult<number>`
- `circularBuffer(input: BufferInput): KernelResult<Polygon2D>`
- `polygonsAdjacent(a: Polygon2D, b: Polygon2D): KernelResult<boolean>`
- `visibilityBetween(input: VisibilityInput): KernelResult<VisibilityResult>`

## Invariants the caller must preserve

- Coordinates are finite numbers in a shared planar coordinate system.
- Polygons contain at least three finite points.
- Degenerate polygons have no centroid and return `KernelResult.err(...)`.
- Buffer radii are finite and non-negative; segment counts are integers `>= 8`.
- Line segments must have distinct finite endpoints for distance and visibility
  helpers.
- Visibility obstacles are closed polygon rings; holes are not represented.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not project latitude/longitude or replace `core/map-layers`.
- Does not handle polygon holes, multipolygons, antimeridian wrapping, CRS
  transforms, spatial indexes, or exact computational-geometry robustness.
- Does not render maps, polygons, buffers, or visibility rays.
- Does not import branch-specific geography or urban-planning presets.

## When to consider this module

Use `core/spatial-analysis` when a sim needs small deterministic planar
geometry: polygon area/centroid, point inclusion, point/segment distance,
circular buffer approximation, adjacency, or line-of-sight against polygon
obstacles. Use `core/map-layers` for geographic map projection and layer
validation.

## Extension protocol

1. Open a `core-change-proposal` issue naming every consuming spatial sim.
2. Add property tests for every new topology, symmetry, or boundedness
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs or
   boundary classification.

## Anti-patterns

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned point or polygon arrays.
- Adding GIS, projection, spatial-index, or rendering dependencies.
- Hiding branch-specific coordinates or map defaults in the kernel.

## How the Anieyrudh Filter reads this module

The Filter checks that spatial visuals make the same quantitative claims as
this kernel. A polygon, buffer, adjacency, or visibility readout whose values
disagree with these functions beyond `spatialAnalysisTolerance.default` is
rejected; the visual layer cannot quietly teach a different model.
