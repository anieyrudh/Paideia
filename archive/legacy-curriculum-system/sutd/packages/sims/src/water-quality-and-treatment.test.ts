import { describe, expect, it } from "vitest";

import { treatmentEvidence } from "./water-quality-and-treatment.js";

describe("treatmentEvidence", () => {
  it("computes treatment evidence for a valid train state", () => {
    const result = treatmentEvidence({
      rawTurbidityNtu: 80,
      filterRemovalPercent: 90,
      pathogenLog10Count: 5,
      chlorineMgPerLitre: 1.2,
      contactMinutes: 30,
      pH: 7.2,
      filterVelocityMetresPerSecond: 0.08,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.finishedTurbidityNtu).toBeCloseTo(8);
    expect(result.value.ctMgMinutesPerLitre).toBeCloseTo(36);
    expect(result.value.pHStatus).toBe("target");
  });

  it("returns a KernelResult error for invalid direct state input", () => {
    const result = treatmentEvidence({
      rawTurbidityNtu: 80,
      filterRemovalPercent: 90,
      pathogenLog10Count: 5,
      chlorineMgPerLitre: 1.2,
      contactMinutes: 30,
      pH: Number.NaN,
      filterVelocityMetresPerSecond: 0.08,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });
});
