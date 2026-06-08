import { describe, expect, it } from "vitest";
import { lagrangeEvidence } from "./optimisation-with-lagrange-multipliers.js";

const unwrap = <T,>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("Lagrange multiplier evidence", () => {
  it("keeps the selected point on the ellipse constraint", () => {
    const evidence = unwrap(lagrangeEvidence({ angleDegrees: 45, radiusX: 3, radiusY: 2 }));

    expect(evidence.constraintValue).toBeCloseTo(1, 10);
    expect(evidence.constraintGradient[0]).toBeGreaterThan(0);
    expect(evidence.constraintGradient[1]).toBeGreaterThan(0);
  });

  it("computes lambda as the projection of objective gradient on constraint gradient", () => {
    const evidence = unwrap(lagrangeEvidence({ angleDegrees: 0, radiusX: 2, radiusY: 2, linearX: 4, linearY: 1, curvature: 0.5 }));

    expect(evidence.point[0]).toBeCloseTo(2, 10);
    expect(evidence.point[1]).toBeCloseTo(0, 10);
    expect(evidence.lambda).toBeCloseTo(3, 5);
  });
});
