import { describe, expect, it } from "vitest";
import { projectPoint } from "./projection.js";

describe("3D projection", () => {
  it("uses isotropic scale across unequal box spans", () => {
    const box = {
      x: { min: -10, max: 10 },
      y: { min: -1, max: 1 },
      z: { min: -1, max: 1 },
    };

    const origin = projectPoint({ x: 0, y: 0, z: 0 }, box, 600, 400);
    const oneX = projectPoint({ x: 1, y: 0, z: 0 }, box, 600, 400);
    const oneY = projectPoint({ x: 0, y: 1, z: 0 }, box, 600, 400);

    const dx = Math.hypot(oneX.x - origin.x, oneX.y - origin.y);
    const dy = Math.hypot(oneY.x - origin.x, oneY.y - origin.y);

    expect(dy).toBeCloseTo(dx / Math.hypot(0.82, 0.32), 8);
  });
});
