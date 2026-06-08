import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  circularBuffer,
  distanceBetweenPoints,
  distancePointToSegment,
  lineSegment2D,
  point2D,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polygonMetrics,
  polygonsAdjacent,
  spatialAnalysisTolerance,
  visibilityBetween,
  type Point2D,
  type Polygon2D,
} from "./index.js";

const p = (x: number, y: number): Point2D => {
  const result = point2D(x, y);
  if (!result.ok) throw new Error(`invalid test point ${x}, ${y}`);
  return result.value;
};

const square: Polygon2D = [p(0, 0), p(2, 0), p(2, 2), p(0, 2)];

describe("@paideia/spatial-analysis", () => {
  it("computes polygon area, centroid, and orientation", () => {
    const result = polygonMetrics(square);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.area).toBeCloseTo(4);
      expect(result.value.signedArea).toBeCloseTo(4);
      expect(result.value.centroid).toEqual([1, 1]);
      expect(result.value.orientation).toBe("counterclockwise");
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.centroid)).toBe(true);
    }
  });

  it("classifies points inside, outside, and on polygon boundary", () => {
    expect(pointInPolygon(p(1, 1), square)).toEqual({ ok: true, value: "inside" });
    expect(pointInPolygon(p(3, 1), square)).toEqual({ ok: true, value: "outside" });
    expect(pointInPolygon(p(2, 1), square)).toEqual({ ok: true, value: "boundary" });
  });

  it("computes point and segment distances", () => {
    const pointDistance = distanceBetweenPoints(p(0, 0), p(3, 4));
    expect(pointDistance.ok).toBe(true);
    if (pointDistance.ok) expect(pointDistance.value).toBeCloseTo(5);

    const segment = lineSegment2D(p(0, 0), p(4, 0));
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;
    const distance = distancePointToSegment(p(2, 3), segment.value);
    expect(distance.ok).toBe(true);
    if (distance.ok) expect(distance.value).toBeCloseTo(3);
  });

  it("builds an immutable circular buffer approximation", () => {
    const result = circularBuffer({ center: p(0, 0), radius: 2, segments: 16 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(16);
      expect(result.value[0]).toEqual([2, 0]);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value[0])).toBe(true);
    }
  });

  it("detects shared-edge polygon adjacency without treating point touches as adjacent", () => {
    const rightSquare: Polygon2D = [p(2, 0), p(4, 0), p(4, 2), p(2, 2)];
    const cornerTouch: Polygon2D = [p(2, 2), p(4, 2), p(4, 4), p(2, 4)];

    expect(polygonsAdjacent(square, rightSquare)).toEqual({ ok: true, value: true });
    expect(polygonsAdjacent(square, cornerTouch)).toEqual({ ok: true, value: false });
  });

  it("detects visibility blocked by polygon obstacles", () => {
    const segment = lineSegment2D(p(-1, 1), p(3, 1));
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;

    const blocked = visibilityBetween({ segment: segment.value, obstacles: [square] });
    expect(blocked.ok).toBe(true);
    if (blocked.ok) {
      expect(blocked.value.visible).toBe(false);
      expect(blocked.value.blockingObstacleIndex).toBe(0);
      expect(Object.isFrozen(blocked.value)).toBe(true);
    }

    const clear = visibilityBetween({
      segment: { start: p(-1, 3), end: p(3, 3) },
      obstacles: [square],
    });
    expect(clear.ok).toBe(true);
    if (clear.ok) expect(clear.value.visible).toBe(true);
  });

  it("returns precondition errors for degenerate polygon and segment inputs", () => {
    const degenerateArea = polygonArea([p(0, 0), p(1, 1), p(2, 2)]);
    expect(degenerateArea.ok).toBe(false);
    if (!degenerateArea.ok) expect(degenerateArea.error.code).toBe("precondition-violated");

    const degenerateSegment = lineSegment2D(p(0, 0), p(0, 0));
    expect(degenerateSegment.ok).toBe(false);
    if (!degenerateSegment.ok) {
      expect(degenerateSegment.error.code).toBe("precondition-violated");
    }
  });

  it("returns out-of-domain errors for invalid coordinates and buffer radius", () => {
    const badPoint = point2D(Number.NaN, 0);
    expect(badPoint.ok).toBe(false);
    if (!badPoint.ok) expect(badPoint.error.code).toBe("out-of-domain");

    const badBuffer = circularBuffer({ center: p(0, 0), radius: -1 });
    expect(badBuffer.ok).toBe(false);
    if (!badBuffer.ok) expect(badBuffer.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for undersampled buffers and malformed polygons", () => {
    const badBuffer = circularBuffer({ center: p(0, 0), radius: 1, segments: 7 });
    expect(badBuffer.ok).toBe(false);
    if (!badBuffer.ok) expect(badBuffer.error.code).toBe("precondition-violated");

    const badContainment = pointInPolygon(p(0, 0), [p(0, 0), p(1, 0)]);
    expect(badContainment.ok).toBe(false);
    if (!badContainment.ok) expect(badContainment.error.code).toBe("precondition-violated");
  });

  it("keeps area invariant under vertex rotation", () => {
    const rotated: Polygon2D = [square[1] ?? p(0, 0), square[2] ?? p(0, 0), square[3] ?? p(0, 0), square[0] ?? p(0, 0)];
    const areaA = polygonArea(square);
    const areaB = polygonArea(rotated);

    expect(areaA.ok).toBe(true);
    expect(areaB.ok).toBe(true);
    if (areaA.ok && areaB.ok) {
      expect(approxEqual(areaA.value, areaB.value, spatialAnalysisTolerance.tight)).toBe(true);
    }
  });

  it("computes centroid through the dedicated helper", () => {
    const centroid = polygonCentroid(square);
    expect(centroid.ok).toBe(true);
    if (centroid.ok) expect(centroid.value).toEqual([1, 1]);
  });
});
