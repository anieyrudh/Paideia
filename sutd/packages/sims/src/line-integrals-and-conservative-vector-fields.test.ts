import { describe, expect, it } from "vitest";
import { lineIntegralEvidence } from "./line-integrals-and-conservative-vector-fields";

describe("lineIntegralEvidence", () => {
  it("matches the potential change for a conservative field", () => {
    const result = lineIntegralEvidence({
      fieldKind: "conservative",
      curveKind: "elbow",
      endX: 2,
      endY: 1,
      bend: -1,
      steps: 128,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.work).toBeCloseTo(result.value.potentialChange, 2);
    expect(Math.abs(result.value.pathGap)).toBeLessThan(0.05);
  });

  it("marks rotational fields as path dependent", () => {
    const result = lineIntegralEvidence({
      fieldKind: "rotational",
      curveKind: "elbow",
      endX: 2,
      endY: 1,
      bend: 2,
      steps: 128,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conservative).toBe(false);
    expect(result.value.work).not.toBeCloseTo(0, 1);
  });
});
