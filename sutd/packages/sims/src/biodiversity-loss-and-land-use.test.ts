import { describe, expect, it } from "vitest";

import { biodiversityEvidence } from "./biodiversity-loss-and-land-use.js";

describe("biodiversityEvidence", () => {
  it("computes land-use trajectory evidence for a valid state", () => {
    const result = biodiversityEvidence({
      habitatPercent: 80,
      conversionPercentPerYear: 2,
      restorationPercentPerYear: 0.5,
      sensitivity: 1.4,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.trajectory.length).toBeGreaterThan(10);
    expect(result.value.finalHabitatPercent).toBeLessThan(80);
    expect(result.value.biodiversityLossPercent).toBeGreaterThan(0);
  });

  it("returns a KernelResult error for invalid direct state input", () => {
    const result = biodiversityEvidence({
      habitatPercent: 80,
      conversionPercentPerYear: Number.NaN,
      restorationPercentPerYear: 0.5,
      sensitivity: 1.4,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });
});
