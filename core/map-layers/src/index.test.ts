import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  containsCoordinate,
  featureBounds,
  fitViewport,
  geoBounds,
  geoCoordinate,
  sceneBounds,
  sortLayers,
  validateLayer,
  webMercatorProject,
  webMercatorUnproject,
  type GeoCoordinate,
  type MapLayer,
} from "./index.js";

const singapore: GeoCoordinate = { lat: 1.3521, lon: 103.8198 };

const pointLayer: MapLayer = {
  id: "campuses",
  title: "Campuses",
  type: "markers",
  zIndex: 2,
  features: [
    {
      id: "sutd",
      geometry: { kind: "point", coordinate: singapore },
      properties: { label: "SUTD" },
    },
  ],
};

describe("coordinate and bounds validation", () => {
  it("accepts valid coordinates and rejects invalid coordinates", () => {
    expect(geoCoordinate(0, 0)).toEqual({ ok: true, value: { lat: 0, lon: 0 } });
    expect(geoCoordinate(91, 0).ok).toBe(false);
    expect(geoCoordinate(0, 181).ok).toBe(false);
    expect(geoCoordinate(Number.NaN, 0).ok).toBe(false);
  });

  it("accepts non-antimeridian bounds and rejects wrapped bounds", () => {
    expect(geoBounds({ south: -1, west: 100, north: 2, east: 104 }).ok).toBe(true);
    expect(geoBounds({ south: 2, west: 100, north: -1, east: 104 }).ok).toBe(false);
    expect(geoBounds({ south: -1, west: 170, north: 2, east: -170 }).ok).toBe(false);
  });

  it("checks containment only after validating both inputs", () => {
    expect(
      containsCoordinate({ south: 1, west: 103, north: 2, east: 104 }, singapore),
    ).toEqual({ ok: true, value: true });
    expect(
      containsCoordinate({ south: 2, west: 103, north: 3, east: 104 }, singapore),
    ).toEqual({ ok: true, value: false });
    expect(
      containsCoordinate({ south: 1, west: 170, north: 2, east: -170 }, singapore).ok,
    ).toBe(false);
  });
});

describe("Web Mercator projection", () => {
  it("round-trips coordinates inside the projection domain", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
        (lat, lon) => {
          const projected = webMercatorProject({ lat, lon });
          expect(projected.ok).toBe(true);
          if (!projected.ok) return;
          const unprojected = webMercatorUnproject(projected.value);
          expect(unprojected.ok).toBe(true);
          if (!unprojected.ok) return;
          expect(unprojected.value.lat).toBeCloseTo(lat, 10);
          expect(unprojected.value.lon).toBeCloseTo(lon, 10);
        },
      ),
    );
  });

  it("rejects polar latitudes that Web Mercator cannot represent", () => {
    expect(webMercatorProject({ lat: 89, lon: 0 }).ok).toBe(false);
  });

  it("rejects unprojection points outside the normalized world", () => {
    expect(webMercatorUnproject({ x: 0.5, y: -1 }).ok).toBe(false);
    expect(webMercatorUnproject({ x: 1.2, y: 0.5 }).ok).toBe(false);
  });
});

describe("viewport fitting", () => {
  it("creates a finite viewport centered on bounds", () => {
    const result = fitViewport(
      { south: 1, west: 103, north: 2, east: 104 },
      { width: 640, height: 480 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.center).toEqual({ lat: 1.5, lon: 103.5 });
    expect(Number.isFinite(result.value.zoom)).toBe(true);
    expect(result.value.zoom).toBeGreaterThan(0);
  });

  it("rejects invalid map sizes", () => {
    expect(
      fitViewport({ south: 1, west: 103, north: 2, east: 104 }, { width: 0, height: 480 }).ok,
    ).toBe(false);
  });
});

describe("features and layers", () => {
  it("computes feature bounds for lines", () => {
    const lineBounds = featureBounds({
      id: "path",
      geometry: {
        kind: "line",
        coordinates: [
          { lat: 1, lon: 100 },
          { lat: 3, lon: 104 },
        ],
      },
    });
    expect(lineBounds).toEqual({
      ok: true,
      value: { south: 1, west: 100, north: 3, east: 104 },
    });
  });

  it("rejects malformed features and styles", () => {
    expect(
      featureBounds({
        id: "short",
        geometry: { kind: "line", coordinates: [singapore] },
      }).ok,
    ).toBe(false);
    expect(validateLayer({ ...pointLayer, style: { opacity: 2 } }).ok).toBe(false);
  });

  it("rejects unknown runtime geometry kinds", () => {
    const result = validateLayer({
      ...pointLayer,
      features: [
        {
          id: "bad-geometry",
          geometry: { kind: "circle", center: singapore } as never,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });

  it("sorts layers by z-index without mutating the caller array", () => {
    const layers: readonly MapLayer[] = [
      pointLayer,
      { ...pointLayer, id: "base", title: "Base", zIndex: 0 },
      { ...pointLayer, id: "labels", title: "Labels", zIndex: 2 },
    ];
    const before = JSON.stringify(layers);
    const result = sortLayers(layers);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((layer) => layer.id)).toEqual(["base", "campuses", "labels"]);
    expect(JSON.stringify(layers)).toBe(before);
  });

  it("rejects duplicate layer ids", () => {
    expect(sortLayers([pointLayer, pointLayer]).ok).toBe(false);
  });
});

describe("scene bounds", () => {
  it("uses visible feature extents", () => {
    const result = sceneBounds({
      layers: [
        pointLayer,
        {
          ...pointLayer,
          id: "hidden",
          title: "Hidden",
          visible: false,
          features: [
            { id: "hidden-point", geometry: { kind: "point", coordinate: { lat: 10, lon: 10 } } },
          ],
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      value: { south: singapore.lat, west: singapore.lon, north: singapore.lat, east: singapore.lon },
    });
  });

  it("falls back to explicit bounds when no visible features exist", () => {
    const explicit = { south: 1, west: 103, north: 2, east: 104 };
    expect(sceneBounds({ layers: [], bounds: explicit })).toEqual({ ok: true, value: explicit });
    expect(sceneBounds({ layers: [] }).ok).toBe(false);
  });
});
