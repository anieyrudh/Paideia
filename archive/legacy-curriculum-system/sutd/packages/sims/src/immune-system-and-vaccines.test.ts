import { describe, expect, it } from "vitest";

import { immunityEvidence } from "./immune-system-and-vaccines.js";

describe("immunityEvidence", () => {
  it("at R0 = 4, coverage 0.6 gives Re = 1.6 and 'growing' verdict", () => {
    const result = immunityEvidence({
      r0: 4,
      coverage: 0.6,
      waningRate: 0,
      daysSinceVaccination: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.effectiveReproductionNumber).toBeCloseTo(1.6, 2);
    expect(result.value.threshold).toBeCloseTo(0.75, 6);
    expect(result.value.verdict).toBe("growing");
  });

  it("at R0 = 4, coverage 0.9 gives Re < 1 and 'contained' verdict", () => {
    const result = immunityEvidence({
      r0: 4,
      coverage: 0.9,
      waningRate: 0,
      daysSinceVaccination: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.effectiveReproductionNumber).toBeLessThan(1);
    expect(result.value.verdict).toBe("contained");
  });

  it("waning lowers effective coverage and lifts Re over time", () => {
    const fresh = immunityEvidence({
      r0: 5,
      coverage: 0.9,
      waningRate: 0.005,
      daysSinceVaccination: 0,
    });
    const aged = immunityEvidence({
      r0: 5,
      coverage: 0.9,
      waningRate: 0.005,
      daysSinceVaccination: 200,
    });
    expect(fresh.ok && aged.ok).toBe(true);
    if (!fresh.ok || !aged.ok) return;
    expect(aged.value.effectiveCoverage).toBeLessThan(fresh.value.effectiveCoverage);
    expect(aged.value.effectiveReproductionNumber).toBeGreaterThan(fresh.value.effectiveReproductionNumber);
  });

  it("R0 = 15 needs about 93 percent coverage for the threshold", () => {
    const result = immunityEvidence({
      r0: 15,
      coverage: 0.9,
      waningRate: 0,
      daysSinceVaccination: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.threshold).toBeCloseTo(14 / 15, 4);
  });

  it("rejects NaN R0", () => {
    const result = immunityEvidence({
      r0: Number.NaN,
      coverage: 0.6,
      waningRate: 0,
      daysSinceVaccination: 0,
    });
    expect(result.ok).toBe(false);
  });
});
