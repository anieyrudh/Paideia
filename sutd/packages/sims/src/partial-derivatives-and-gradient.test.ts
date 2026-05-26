import { describe, expect, it } from "vitest";
import { gradientSurfaceEvidence } from "./partial-derivatives-and-gradient.js";

const unwrap = <T,>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("partial derivatives and gradient evidence", () => {
  it("computes gradient components from the vector-calculus kernel", () => {
    const evidence = unwrap(
      gradientSurfaceEvidence({
        surfaceKind: "bowl",
        x: 1,
        y: 0.5,
        xCurvature: 1.2,
        yCurvature: 0.8,
        coupling: 0.3,
        directionDegrees: 0,
      }),
    );

    expect(evidence.gradient.value[0]).toBeCloseTo(1.75, 5);
    expect(evidence.gradient.value[1]).toBeCloseTo(0.5, 5);
    expect(evidence.directionalDerivative).toBeCloseTo(evidence.gradient.value[0], 5);
  });

  it("classifies a direction tangent to a contour as level when projection is near zero", () => {
    const base = unwrap(gradientSurfaceEvidence({ x: 1, y: 0, directionDegrees: 0 }));
    const tangentDegrees =
      ((Math.atan2(base.gradient.value[0], -base.gradient.value[1]) * 180) / Math.PI + 360) % 360;
    const tangent = unwrap(gradientSurfaceEvidence({ x: 1, y: 0, directionDegrees: tangentDegrees }));

    expect(Math.abs(tangent.directionalDerivative)).toBeLessThan(0.05);
    expect(tangent.contourClassification).toBe("level");
  });
});
