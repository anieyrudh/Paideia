import { err, ok, type KernelResult } from "@paideia/shared";

export interface GeoCoordinate {
  readonly lat: number;
  readonly lon: number;
}

export interface GeoBounds {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
}

export interface MapSize {
  readonly width: number;
  readonly height: number;
}

export interface WebMercatorPoint {
  readonly x: number;
  readonly y: number;
}

export interface MapViewport {
  readonly center: GeoCoordinate;
  readonly zoom: number;
  readonly size: MapSize;
}

export type MapGeometry =
  | { readonly kind: "point"; readonly coordinate: GeoCoordinate }
  | { readonly kind: "line"; readonly coordinates: readonly GeoCoordinate[] }
  | { readonly kind: "polygon"; readonly rings: readonly (readonly GeoCoordinate[])[] };

export interface MapFeature {
  readonly id: string;
  readonly geometry: MapGeometry;
  readonly properties?: Readonly<Record<string, string | number | boolean>>;
}

export type MapLayerType = "markers" | "polylines" | "polygons" | "heatmap" | "raster";

export interface MapLayerStyle {
  readonly stroke?: string;
  readonly fill?: string;
  readonly opacity?: number;
  readonly weight?: number;
}

export interface MapLayer {
  readonly id: string;
  readonly title: string;
  readonly type: MapLayerType;
  readonly features: readonly MapFeature[];
  readonly visible?: boolean;
  readonly zIndex?: number;
  readonly style?: MapLayerStyle;
}

export interface MapScene {
  readonly layers: readonly MapLayer[];
  readonly bounds?: GeoBounds;
}

const maxMercatorLatitude = 85.05112878;
const tileSize = 256;

export const geoCoordinate = (lat: number, lon: number): KernelResult<GeoCoordinate> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return err("out-of-domain", "Latitude and longitude must be finite numbers");
  }

  if (lat < -90 || lat > 90) {
    return err("out-of-domain", `Latitude must be in [-90, 90], got ${lat}`);
  }

  if (lon < -180 || lon > 180) {
    return err("out-of-domain", `Longitude must be in [-180, 180], got ${lon}`);
  }

  return ok({ lat, lon });
};

export const geoBounds = (bounds: GeoBounds): KernelResult<GeoBounds> => {
  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    return err("out-of-domain", "Bounds must contain finite numbers");
  }

  if (bounds.south < -90 || bounds.north > 90) {
    return err("out-of-domain", "Bounds latitude must stay within [-90, 90]");
  }

  if (bounds.west < -180 || bounds.east > 180) {
    return err("out-of-domain", "Bounds longitude must stay within [-180, 180]");
  }

  if (bounds.south > bounds.north) {
    return err("precondition-violated", "Bounds south must be <= north");
  }

  if (bounds.west > bounds.east) {
    return err(
      "precondition-violated",
      "Bounds west must be <= east; antimeridian wrapping is not supported in v0",
    );
  }

  return ok(bounds);
};

export const containsCoordinate = (
  bounds: GeoBounds,
  coordinate: GeoCoordinate,
): KernelResult<boolean> => {
  const validBounds = geoBounds(bounds);
  if (!validBounds.ok) return validBounds;
  const validCoordinate = geoCoordinate(coordinate.lat, coordinate.lon);
  if (!validCoordinate.ok) return validCoordinate;

  return ok(
    coordinate.lat >= bounds.south &&
      coordinate.lat <= bounds.north &&
      coordinate.lon >= bounds.west &&
      coordinate.lon <= bounds.east,
  );
};

export const webMercatorProject = (
  coordinate: GeoCoordinate,
): KernelResult<WebMercatorPoint> => {
  const validCoordinate = geoCoordinate(coordinate.lat, coordinate.lon);
  if (!validCoordinate.ok) return validCoordinate;

  if (
    coordinate.lat < -maxMercatorLatitude ||
    coordinate.lat > maxMercatorLatitude
  ) {
    return err(
      "out-of-domain",
      `Web Mercator latitude must be in [-${maxMercatorLatitude}, ${maxMercatorLatitude}], got ${coordinate.lat}`,
    );
  }

  const sinLatitude = Math.sin((coordinate.lat * Math.PI) / 180);
  return ok({
    x: (coordinate.lon + 180) / 360,
    y:
      0.5 -
      Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI),
  });
};

export const webMercatorUnproject = (
  point: WebMercatorPoint,
): KernelResult<GeoCoordinate> => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return err("out-of-domain", "Web Mercator point must contain finite numbers");
  }

  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    return err("out-of-domain", "Web Mercator point must be normalized to [0, 1]");
  }

  const lon = point.x * 360 - 180;
  const lat =
    (180 / Math.PI) *
    Math.atan(Math.sinh(Math.PI * (1 - 2 * point.y)));

  const coordinate = geoCoordinate(lat, lon);
  if (!coordinate.ok) return coordinate;
  if (lat < -maxMercatorLatitude || lat > maxMercatorLatitude) {
    return err(
      "out-of-domain",
      `Unprojected latitude must be in [-${maxMercatorLatitude}, ${maxMercatorLatitude}], got ${lat}`,
    );
  }

  return coordinate;
};

export const fitViewport = (
  bounds: GeoBounds,
  size: MapSize,
): KernelResult<MapViewport> => {
  const validBounds = geoBounds(bounds);
  if (!validBounds.ok) return validBounds;
  const validSize = validateSize(size);
  if (!validSize.ok) return validSize;

  const southWest = webMercatorProject({ lat: bounds.south, lon: bounds.west });
  if (!southWest.ok) return southWest;
  const northEast = webMercatorProject({ lat: bounds.north, lon: bounds.east });
  if (!northEast.ok) return northEast;

  const projectedWidth = Math.max(Math.abs(northEast.value.x - southWest.value.x), 1e-12);
  const projectedHeight = Math.max(Math.abs(southWest.value.y - northEast.value.y), 1e-12);
  const xZoom = Math.log2(size.width / (tileSize * projectedWidth));
  const yZoom = Math.log2(size.height / (tileSize * projectedHeight));
  const center = geoCoordinate(
    (bounds.south + bounds.north) / 2,
    (bounds.west + bounds.east) / 2,
  );
  if (!center.ok) return center;

  return ok({
    center: center.value,
    zoom: Math.max(0, Math.min(xZoom, yZoom)),
    size,
  });
};

export const featureBounds = (feature: MapFeature): KernelResult<GeoBounds> => {
  const validFeature = validateFeature(feature);
  if (!validFeature.ok) return validFeature;

  return boundsFromCoordinates(coordinatesForGeometry(feature.geometry));
};

export const validateLayer = (layer: MapLayer): KernelResult<MapLayer> => {
  if (!isTrimmedNonEmpty(layer.id)) {
    return err("precondition-violated", "Layer id must be non-empty and trimmed");
  }

  if (!isTrimmedNonEmpty(layer.title)) {
    return err("precondition-violated", "Layer title must be non-empty and trimmed");
  }

  if (!isLayerType(layer.type)) {
    return err("out-of-domain", `Unknown map layer type: ${String(layer.type)}`);
  }

  if (layer.zIndex !== undefined && !Number.isFinite(layer.zIndex)) {
    return err("out-of-domain", "Layer zIndex must be finite when present");
  }

  if (layer.style !== undefined) {
    const validStyle = validateStyle(layer.style);
    if (!validStyle.ok) return validStyle;
  }

  for (const feature of layer.features) {
    const validFeature = validateFeature(feature);
    if (!validFeature.ok) return validFeature;
  }

  return ok(layer);
};

export const sortLayers = (
  layers: readonly MapLayer[],
): KernelResult<readonly MapLayer[]> => {
  const seen = new Set<string>();
  for (const layer of layers) {
    const validLayer = validateLayer(layer);
    if (!validLayer.ok) return validLayer;
    if (seen.has(layer.id)) {
      return err("precondition-violated", `Duplicate map layer id: ${layer.id}`);
    }
    seen.add(layer.id);
  }

  return ok(
    [...layers].sort((left, right) => {
      const zDiff = (left.zIndex ?? 0) - (right.zIndex ?? 0);
      return zDiff === 0 ? left.id.localeCompare(right.id) : zDiff;
    }),
  );
};

export const sceneBounds = (scene: MapScene): KernelResult<GeoBounds> => {
  if (scene.bounds !== undefined) {
    const validBounds = geoBounds(scene.bounds);
    if (!validBounds.ok) return validBounds;
  }

  const sorted = sortLayers(scene.layers);
  if (!sorted.ok) return sorted;

  const visibleCoordinates: GeoCoordinate[] = [];
  for (const layer of sorted.value) {
    if (layer.visible === false) continue;
    for (const feature of layer.features) {
      visibleCoordinates.push(...coordinatesForGeometry(feature.geometry));
    }
  }

  if (visibleCoordinates.length === 0) {
    return scene.bounds === undefined
      ? err("precondition-violated", "Scene has no visible features or explicit bounds")
      : ok(scene.bounds);
  }

  return boundsFromCoordinates(visibleCoordinates);
};

const layerTypes = ["markers", "polylines", "polygons", "heatmap", "raster"] as const;
const layerTypeSet: ReadonlySet<string> = new Set(layerTypes);

const isLayerType = (value: unknown): value is MapLayerType =>
  typeof value === "string" && layerTypeSet.has(value);

const isTrimmedNonEmpty = (value: string): boolean =>
  value.length > 0 && value.trim() === value;

const validateSize = (size: MapSize): KernelResult<MapSize> => {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    return err("out-of-domain", "Map size width and height must be finite positive numbers");
  }

  return ok(size);
};

const validateStyle = (style: MapLayerStyle): KernelResult<MapLayerStyle> => {
  if (style.opacity !== undefined && (style.opacity < 0 || style.opacity > 1)) {
    return err("out-of-domain", "Layer opacity must be in [0, 1]");
  }

  if (style.weight !== undefined && (!Number.isFinite(style.weight) || style.weight < 0)) {
    return err("out-of-domain", "Layer weight must be a finite non-negative number");
  }

  return ok(style);
};

const validateFeature = (feature: MapFeature): KernelResult<MapFeature> => {
  if (!isTrimmedNonEmpty(feature.id)) {
    return err("precondition-violated", "Feature id must be non-empty and trimmed");
  }

  switch (feature.geometry.kind) {
    case "point":
      return mapCoordinateResult(feature.geometry.coordinate, feature);
    case "line":
      if (feature.geometry.coordinates.length < 2) {
        return err("precondition-violated", "Line geometry requires at least two coordinates");
      }
      return validateCoordinates(feature.geometry.coordinates, feature);
    case "polygon":
      if (feature.geometry.rings.length === 0) {
        return err("precondition-violated", "Polygon geometry requires at least one ring");
      }
      for (const ring of feature.geometry.rings) {
        if (ring.length < 3) {
          return err("precondition-violated", "Polygon rings require at least three coordinates");
        }
        const validRing = validateCoordinates(ring, feature);
        if (!validRing.ok) return validRing;
      }
      return ok(feature);
    default:
      return err(
        "out-of-domain",
        `Unknown map geometry kind: ${String((feature.geometry as { readonly kind?: unknown }).kind)}`,
      );
  }
};

const mapCoordinateResult = (
  coordinate: GeoCoordinate,
  feature: MapFeature,
): KernelResult<MapFeature> => {
  const validCoordinate = geoCoordinate(coordinate.lat, coordinate.lon);
  return validCoordinate.ok ? ok(feature) : validCoordinate;
};

const validateCoordinates = (
  coordinates: readonly GeoCoordinate[],
  feature: MapFeature,
): KernelResult<MapFeature> => {
  for (const coordinate of coordinates) {
    const validCoordinate = geoCoordinate(coordinate.lat, coordinate.lon);
    if (!validCoordinate.ok) return validCoordinate;
  }
  return ok(feature);
};

const coordinatesForGeometry = (geometry: MapGeometry): readonly GeoCoordinate[] => {
  switch (geometry.kind) {
    case "point":
      return [geometry.coordinate];
    case "line":
      return geometry.coordinates;
    case "polygon":
      return geometry.rings.flatMap((ring) => [...ring]);
  }
};

const boundsFromCoordinates = (
  coordinates: readonly GeoCoordinate[],
): KernelResult<GeoBounds> => {
  if (coordinates.length === 0) {
    return err("precondition-violated", "Cannot compute bounds for an empty coordinate set");
  }

  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  for (const coordinate of coordinates) {
    const validCoordinate = geoCoordinate(coordinate.lat, coordinate.lon);
    if (!validCoordinate.ok) return validCoordinate;
    south = Math.min(south, coordinate.lat);
    west = Math.min(west, coordinate.lon);
    north = Math.max(north, coordinate.lat);
    east = Math.max(east, coordinate.lon);
  }

  return geoBounds({ south, west, north, east });
};
