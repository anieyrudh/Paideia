import { describe, expect, it } from "vitest";
import { gaussianEvidence } from "./gaussian-elimination-and-linear-systems";

describe("gaussianEvidence", () => {
  it("classifies a unique solution", () => {
    const result = gaussianEvidence({ a: 2, b: 1, c: 1, d: -1, e: 5, f: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.classification).toBe("unique");
    expect(result.value.solution?.[0]).toBeCloseTo(2);
    expect(result.value.solution?.[1]).toBeCloseTo(1);
  });
});
