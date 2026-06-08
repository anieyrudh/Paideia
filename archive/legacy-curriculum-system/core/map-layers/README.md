# @paideia/map-layers

Pure geospatial helpers for map-shaped simulations.

This package validates coordinates and layers, projects coordinates into Web
Mercator, fits viewports, and computes feature or scene bounds. It does not
fetch tiles, import a browser map engine, or own provider attribution.

## Example

```ts
import { fitViewport, sceneBounds } from "@paideia/map-layers";

const bounds = sceneBounds({
  layers: [
    {
      id: "campuses",
      title: "Campuses",
      type: "markers",
      features: [
        {
          id: "sutd",
          geometry: { kind: "point", coordinate: { lat: 1.3411, lon: 103.9637 } },
        },
      ],
    },
  ],
});

if (bounds.ok) {
  const viewport = fitViewport(bounds.value, { width: 640, height: 420 });
  // Pass viewport.value to the map renderer owned by the consuming app.
}
```

## Conventions

- Coordinates use latitude/longitude in degrees.
- Bounds are non-antimeridian rectangles: `south <= north` and `west <= east`.
- Web Mercator rejects latitudes outside `[-85.05112878, 85.05112878]`.
- Sorting layers returns a new array; caller-owned arrays are never mutated.
- Tile providers, attribution, API keys, and network loading stay outside core.
