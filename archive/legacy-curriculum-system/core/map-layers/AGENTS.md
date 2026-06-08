# core/map-layers - agent contract

## What this module is

Pure geospatial layer helpers for simulations that need maps without importing a
heavy map runtime into every shell. It owns coordinate validation, simple
non-antimeridian bounds, Web Mercator projection, viewport fitting, feature
bounds, layer validation, layer ordering, and scene bounds.

This package prepares map data for renderers. Browser map engines, tile
providers, attribution UI, and network fetching live outside this kernel.

## Public interface

Exports from `@paideia/map-layers`:

- `GeoCoordinate = { lat: number; lon: number }`
- `GeoBounds = { south: number; west: number; north: number; east: number }`
- `MapSize = { width: number; height: number }`
- `WebMercatorPoint = { x: number; y: number }`
- `MapViewport = { center: GeoCoordinate; zoom: number; size: MapSize }`
- `MapGeometry = { kind: "point"; coordinate: GeoCoordinate } | { kind: "line"; coordinates: readonly GeoCoordinate[] } | { kind: "polygon"; rings: readonly (readonly GeoCoordinate[])[] }`
- `MapFeature = { id: string; geometry: MapGeometry; properties?: Readonly<Record<string, string | number | boolean>> }`
- `MapLayerType = "markers" | "polylines" | "polygons" | "heatmap" | "raster"`
- `MapLayerStyle = { stroke?: string; fill?: string; opacity?: number; weight?: number }`
- `MapLayer = { id: string; title: string; type: MapLayerType; features: readonly MapFeature[]; visible?: boolean; zIndex?: number; style?: MapLayerStyle }`
- `MapScene = { layers: readonly MapLayer[]; bounds?: GeoBounds }`
- `geoCoordinate(lat: number, lon: number): KernelResult<GeoCoordinate>`
- `geoBounds(bounds: GeoBounds): KernelResult<GeoBounds>`
- `containsCoordinate(bounds: GeoBounds, coordinate: GeoCoordinate): KernelResult<boolean>`
- `webMercatorProject(coordinate: GeoCoordinate): KernelResult<WebMercatorPoint>`
- `webMercatorUnproject(point: WebMercatorPoint): KernelResult<GeoCoordinate>`
- `fitViewport(bounds: GeoBounds, size: MapSize): KernelResult<MapViewport>`
- `featureBounds(feature: MapFeature): KernelResult<GeoBounds>`
- `validateLayer(layer: MapLayer): KernelResult<MapLayer>`
- `sortLayers(layers: readonly MapLayer[]): KernelResult<readonly MapLayer[]>`
- `sceneBounds(scene: MapScene): KernelResult<GeoBounds>`

## Invariants the caller must preserve

- Latitude is finite and in `[-90, 90]`; longitude is finite and in
  `[-180, 180]`.
- Web Mercator projection is only valid in `[-85.05112878, 85.05112878]`.
- Bounds are finite and non-antimeridian: `south <= north` and `west <= east`.
- Map sizes have finite positive `width` and `height`.
- Feature and layer ids are non-empty trimmed strings.
- Line geometry contains at least two coordinates.
- Polygon geometry contains at least one ring, and each ring has at least three
  coordinates.
- Layer ids are unique after sorting.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not import Leaflet, Mapbox GL, deck.gl, browser DOM, canvas, WebGL, or
  tile-network code.
- Does not fetch tiles or geocode addresses.
- Does not own provider attribution, API keys, or licensing text.
- Does not support antimeridian-wrapping bounds in v0.
- Does not simplify geometries or run spatial indexes.
- Does not choose curriculum-specific map defaults.

## When to consider this module

Use `core/map-layers` when a sim needs map-shaped data: validated coordinates,
layer ordering, feature extents, Web Mercator projection, or a viewport that
fits a set of features. If the task is a non-geographic graph, use
`core/graph-layout`; if it is a quantitative chart, use `core/charting`.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current map consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to projection, bounds semantics, or layer
   validation.

## Anti-patterns (will be rejected in PR review)

- Adding tile-provider SDKs or network fetches to this pure kernel.
- Silently accepting out-of-range coordinates by wrapping or clipping.
- Mutating feature arrays while sorting or validating.
- Branch-specific defaults (`if SUTD then satellite`).
- Treating antimeridian-crossing bounds as normal rectangular bounds.

## How the Anieyrudh Filter reads this module

The Filter probes that geographic visuals do not lie about location or extent.
A map layer that silently wraps longitude, clips polar latitudes, or drops an
invalid geometry instead of returning an error fails review.
