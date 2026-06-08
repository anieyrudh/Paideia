import { describe, expect, it } from "vitest";
import {
  renderableBonds,
  sampleParametricCurve3D,
  sampleSurface,
  sampleVectorField3D,
} from "./sampling.js";

describe("three-scene geometry sampling", () => {
  it("samples surface bounds inclusively and floors the sample count", () => {
    const sampled = sampleSurface((x, y) => x + y, {
      x: { min: -1, max: 1 },
      y: { min: 2, max: 4 },
    }, 3.8);

    expect(sampled.samples).toBe(3);
    expect(sampled.points).toHaveLength(9);
    expect(sampled.points[0]).toMatchObject({ x: -1, y: 2, z: 1, row: 0, column: 0 });
    expect(sampled.points.at(-1)).toMatchObject({ x: 1, y: 4, z: 5, row: 2, column: 2 });
  });

  it("drops invalid surface points instead of clamping or fabricating them", () => {
    const sampled = sampleSurface((x, y) => {
      if (x === 0 && y === 0) return Number.NaN;
      if (x === 1 && y === 1) throw new Error("outside domain");
      return x * y;
    }, {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    }, 3);

    expect(sampled.points).toHaveLength(7);
    expect(sampled.points.some((point) => point.x === 0 && point.y === 0)).toBe(false);
    expect(sampled.points.some((point) => point.x === 1 && point.y === 1)).toBe(false);
  });

  it("keeps curve gaps visible when samples are undefined", () => {
    const sampled = sampleParametricCurve3D((t) => {
      if (t === 0) return [Number.NaN, 0, 0];
      return [t, t * t, 0];
    }, { min: -1, max: 1 }, 5);

    expect(sampled.segments).toHaveLength(2);
    expect(sampled.segments[0]?.at(-1)?.x).toBeLessThan(0);
    expect(sampled.segments[1]?.[0]?.x).toBeGreaterThan(0);
  });

  it("drops invalid vector samples", () => {
    const vectors = sampleVectorField3D((x, y, z) => {
      if (x === 0 && y === 0 && z === 0) return [Number.POSITIVE_INFINITY, 0, 0];
      return [x, y, z];
    }, {
      x: { min: 0, max: 1 },
      y: { min: 0, max: 1 },
      z: { min: 0, max: 1 },
    }, 2);

    expect(vectors).toHaveLength(7);
    expect(vectors.every((vector) => Number.isFinite(vector.vx))).toBe(true);
  });

  it("derives renderable molecule bond data from valid atoms only", () => {
    const bonds = renderableBonds([
      { id: "o", element: "O", position: [0, 0, 0] },
      { id: "h", element: "H", position: [1, 0, 0] },
      { id: "bad", element: "H", position: [Number.NaN, 0, 0] },
    ], [
      { from: "o", to: "h", order: 2 },
      { from: "o", to: "bad" },
      { from: "o", to: "missing" },
    ]);

    expect(bonds).toHaveLength(1);
    expect(bonds[0]?.from.id).toBe("o");
    expect(bonds[0]?.to.id).toBe("h");
    expect(bonds[0]?.order).toBe(2);
  });
});
