import { err, ok, type KernelResult } from "@paideia/shared";

export const spatialAnalysisTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Point2D = readonly [x: number, y: number];
export interface LineSegment2D {
  readonly start: Point2D;
  readonly end: Point2D;
}
export type Polygon2D = readonly Point2D[];
export type PointInPolygonResult = "inside" | "outside" | "boundary";

export interface PolygonMetrics {
  readonly signedArea: number;
  readonly area: number;
  readonly centroid: Point2D;
  readonly orientation: "clockwise" | "counterclockwise";
}

export interface BufferInput {
  readonly center: Point2D;
  readonly radius: number;
  readonly segments?: number;
}

export interface VisibilityInput {
  readonly segment: LineSegment2D;
  readonly obstacles: readonly Polygon2D[];
  readonly allowBoundaryTouch?: boolean;
}

export interface VisibilityResult {
  readonly visible: boolean;
  readonly blockingObstacleIndex?: number;
}

export const point2D = (x: number, y: number): KernelResult<Point2D> => {
  const validX = finite(x, "x");
  if (!validX.ok) return validX;
  const validY = finite(y, "y");
  if (!validY.ok) return validY;
  return ok(Object.freeze([x, y] as const));
};

export const lineSegment2D = (
  start: Point2D,
  end: Point2D,
): KernelResult<LineSegment2D> => {
  const validStart = validatePoint(start, "start");
  if (!validStart.ok) return validStart;
  const validEnd = validatePoint(end, "end");
  if (!validEnd.ok) return validEnd;
  if (samePoint(start, end)) {
    return err("precondition-violated", "line segment endpoints must be distinct");
  }
  return ok(Object.freeze({ start: freezePoint(start), end: freezePoint(end) }));
};

export const polygonArea = (polygon: Polygon2D): KernelResult<number> => {
  const metrics = polygonMetrics(polygon);
  return metrics.ok ? ok(metrics.value.area) : metrics;
};

export const polygonCentroid = (polygon: Polygon2D): KernelResult<Point2D> => {
  const metrics = polygonMetrics(polygon);
  return metrics.ok ? ok(metrics.value.centroid) : metrics;
};

export const polygonMetrics = (polygon: Polygon2D): KernelResult<PolygonMetrics> => {
  const valid = validatePolygon(polygon);
  if (!valid.ok) return valid;

  let twiceArea = 0;
  let centroidXAccumulator = 0;
  let centroidYAccumulator = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (current === undefined || next === undefined) {
      return err("precondition-violated", "polygon point missing during area calculation");
    }
    const crossValue = cross(current, next);
    twiceArea += crossValue;
    centroidXAccumulator += (current[0] + next[0]) * crossValue;
    centroidYAccumulator += (current[1] + next[1]) * crossValue;
  }

  const signedArea = twiceArea / 2;
  if (Math.abs(signedArea) <= spatialAnalysisTolerance.tight) {
    return err("precondition-violated", "polygon area must be non-zero");
  }
  const centroid: Point2D = Object.freeze([
    centroidXAccumulator / (6 * signedArea),
    centroidYAccumulator / (6 * signedArea),
  ] as const);
  for (const [label, value] of [
    ["signedArea", signedArea],
    ["centroid x", centroid[0]],
    ["centroid y", centroid[1]],
  ] as const) {
    const validFinite = finiteDerived(value, label);
    if (!validFinite.ok) return validFinite;
  }

  return ok(
    Object.freeze({
      signedArea,
      area: Math.abs(signedArea),
      centroid,
      orientation: signedArea >= 0 ? "counterclockwise" : "clockwise",
    }),
  );
};

export const pointInPolygon = (
  point: Point2D,
  polygon: Polygon2D,
): KernelResult<PointInPolygonResult> => {
  const validPoint = validatePoint(point, "point");
  if (!validPoint.ok) return validPoint;
  const validPolygon = validatePolygon(polygon);
  if (!validPolygon.ok) return validPolygon;

  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    if (current === undefined || previous === undefined) {
      return err("precondition-violated", "polygon point missing during containment test");
    }
    if (pointOnSegment(point, { start: previous, end: current })) {
      return ok("boundary");
    }
    const intersects =
      current[1] > point[1] !== previous[1] > point[1] &&
      point[0] <
        ((previous[0] - current[0]) * (point[1] - current[1])) /
          (previous[1] - current[1]) +
          current[0];
    if (intersects) inside = !inside;
  }
  return ok(inside ? "inside" : "outside");
};

export const distanceBetweenPoints = (
  a: Point2D,
  b: Point2D,
): KernelResult<number> => {
  const validA = validatePoint(a, "a");
  if (!validA.ok) return validA;
  const validB = validatePoint(b, "b");
  if (!validB.ok) return validB;
  return finiteDerived(Math.hypot(a[0] - b[0], a[1] - b[1]), "distance");
};

export const distancePointToSegment = (
  point: Point2D,
  segment: LineSegment2D,
): KernelResult<number> => {
  const validPoint = validatePoint(point, "point");
  if (!validPoint.ok) return validPoint;
  const validSegment = lineSegment2D(segment.start, segment.end);
  if (!validSegment.ok) return validSegment;

  const dx = segment.end[0] - segment.start[0];
  const dy = segment.end[1] - segment.start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = clamp(
    ((point[0] - segment.start[0]) * dx + (point[1] - segment.start[1]) * dy) /
      lengthSquared,
    0,
    1,
  );
  const projection: Point2D = [
    segment.start[0] + t * dx,
    segment.start[1] + t * dy,
  ];
  return distanceBetweenPoints(point, projection);
};

export const circularBuffer = (input: BufferInput): KernelResult<Polygon2D> => {
  const validCenter = validatePoint(input.center, "center");
  if (!validCenter.ok) return validCenter;
  const validRadius = nonNegativeFinite(input.radius, "radius");
  if (!validRadius.ok) return validRadius;
  const segments = input.segments ?? 32;
  if (!Number.isInteger(segments) || segments < 8) {
    return err("precondition-violated", `segments must be an integer >= 8, got ${segments}`);
  }
  const points: Point2D[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (2 * Math.PI * index) / segments;
    points.push(
      Object.freeze([
        input.center[0] + input.radius * Math.cos(angle),
        input.center[1] + input.radius * Math.sin(angle),
      ] as const),
    );
  }
  return ok(Object.freeze(points));
};

export const polygonsAdjacent = (
  a: Polygon2D,
  b: Polygon2D,
): KernelResult<boolean> => {
  const validA = validatePolygon(a);
  if (!validA.ok) return validA;
  const validB = validatePolygon(b);
  if (!validB.ok) return validB;
  for (const edgeA of polygonEdges(a)) {
    for (const edgeB of polygonEdges(b)) {
      if (segmentsOverlap(edgeA, edgeB)) return ok(true);
    }
  }
  return ok(false);
};

export const visibilityBetween = (
  input: VisibilityInput,
): KernelResult<VisibilityResult> => {
  const validSegment = lineSegment2D(input.segment.start, input.segment.end);
  if (!validSegment.ok) return validSegment;
  for (let index = 0; index < input.obstacles.length; index += 1) {
    const obstacle = input.obstacles[index];
    if (obstacle === undefined) {
      return err("precondition-violated", "obstacle missing during visibility test");
    }
    const validObstacle = validatePolygon(obstacle);
    if (!validObstacle.ok) return validObstacle;

    const startClass = pointInPolygon(input.segment.start, obstacle);
    if (!startClass.ok) return startClass;
    const endClass = pointInPolygon(input.segment.end, obstacle);
    if (!endClass.ok) return endClass;
    if (
      startClass.value === "inside" ||
      endClass.value === "inside" ||
      (!input.allowBoundaryTouch &&
        (startClass.value === "boundary" || endClass.value === "boundary"))
    ) {
      return ok(Object.freeze({ visible: false, blockingObstacleIndex: index }));
    }

    for (const edge of polygonEdges(obstacle)) {
      if (segmentsIntersect(input.segment, edge)) {
        if (input.allowBoundaryTouch && intersectionIsEndpointTouch(input.segment, edge)) {
          continue;
        }
        return ok(Object.freeze({ visible: false, blockingObstacleIndex: index }));
      }
    }
  }
  return ok(Object.freeze({ visible: true }));
};

const validatePolygon = (polygon: Polygon2D): KernelResult<void> => {
  if (polygon.length < 3) {
    return err("precondition-violated", "polygon must contain at least three points");
  }
  for (const [index, point] of polygon.entries()) {
    const valid = validatePoint(point, `polygon[${index}]`);
    if (!valid.ok) return valid;
  }
  return ok(undefined);
};

const validatePoint = (point: Point2D, label: string): KernelResult<void> => {
  if (point.length !== 2) {
    return err("precondition-violated", `${label} must contain exactly two coordinates`);
  }
  const x = finite(point[0], `${label}.x`);
  if (!x.ok) return x;
  return finite(point[1], `${label}.y`);
};

const polygonEdges = (polygon: Polygon2D): readonly LineSegment2D[] =>
  Object.freeze(
    polygon.map((point, index) =>
      Object.freeze({
        start: point,
        end: polygon[(index + 1) % polygon.length] ?? point,
      }),
    ),
  );

const pointOnSegment = (point: Point2D, segment: LineSegment2D): boolean => {
  const area = orientation(segment.start, segment.end, point);
  if (Math.abs(area) > spatialAnalysisTolerance.default) return false;
  return (
    point[0] >= Math.min(segment.start[0], segment.end[0]) - spatialAnalysisTolerance.default &&
    point[0] <= Math.max(segment.start[0], segment.end[0]) + spatialAnalysisTolerance.default &&
    point[1] >= Math.min(segment.start[1], segment.end[1]) - spatialAnalysisTolerance.default &&
    point[1] <= Math.max(segment.start[1], segment.end[1]) + spatialAnalysisTolerance.default
  );
};

const segmentsIntersect = (a: LineSegment2D, b: LineSegment2D): boolean => {
  const o1 = orientation(a.start, a.end, b.start);
  const o2 = orientation(a.start, a.end, b.end);
  const o3 = orientation(b.start, b.end, a.start);
  const o4 = orientation(b.start, b.end, a.end);

  if (
    Math.sign(o1) !== Math.sign(o2) &&
    Math.sign(o3) !== Math.sign(o4) &&
    Math.abs(o1) > spatialAnalysisTolerance.default &&
    Math.abs(o2) > spatialAnalysisTolerance.default &&
    Math.abs(o3) > spatialAnalysisTolerance.default &&
    Math.abs(o4) > spatialAnalysisTolerance.default
  ) {
    return true;
  }
  return (
    pointOnSegment(b.start, a) ||
    pointOnSegment(b.end, a) ||
    pointOnSegment(a.start, b) ||
    pointOnSegment(a.end, b)
  );
};

const segmentsOverlap = (a: LineSegment2D, b: LineSegment2D): boolean => {
  if (
    Math.abs(orientation(a.start, a.end, b.start)) > spatialAnalysisTolerance.default ||
    Math.abs(orientation(a.start, a.end, b.end)) > spatialAnalysisTolerance.default
  ) {
    return false;
  }
  const xOverlap =
    Math.max(Math.min(a.start[0], a.end[0]), Math.min(b.start[0], b.end[0])) <=
    Math.min(Math.max(a.start[0], a.end[0]), Math.max(b.start[0], b.end[0])) -
      spatialAnalysisTolerance.default;
  const yOverlap =
    Math.max(Math.min(a.start[1], a.end[1]), Math.min(b.start[1], b.end[1])) <=
    Math.min(Math.max(a.start[1], a.end[1]), Math.max(b.start[1], b.end[1])) -
      spatialAnalysisTolerance.default;
  return xOverlap || yOverlap;
};

const intersectionIsEndpointTouch = (a: LineSegment2D, b: LineSegment2D): boolean =>
  samePoint(a.start, b.start) ||
  samePoint(a.start, b.end) ||
  samePoint(a.end, b.start) ||
  samePoint(a.end, b.end);

const orientation = (a: Point2D, b: Point2D, c: Point2D): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const cross = (a: Point2D, b: Point2D): number => a[0] * b[1] - b[0] * a[1];

const samePoint = (a: Point2D, b: Point2D): boolean =>
  Math.abs(a[0] - b[0]) <= spatialAnalysisTolerance.default &&
  Math.abs(a[1] - b[1]) <= spatialAnalysisTolerance.default;

const freezePoint = (point: Point2D): Point2D =>
  Object.freeze([point[0], point[1]] as const);

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite, got ${value}`);

const nonNegativeFinite = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite and non-negative, got ${value}`);
};

const finiteDerived = <T extends number>(value: T, label: string): KernelResult<T> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed the finite-number model`);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
