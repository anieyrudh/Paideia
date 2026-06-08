import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { bayesEvidence } from "./conditional-probability-and-bayes.js";

describe("conditional-probability-and-bayes sim model", () => {
  it("computes posterior from true-positive and false-positive routes", () => {
    const evidence = bayesEvidence({
      prevalencePercent: 10,
      sensitivityPercent: 95,
      specificityPercent: 90,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(approxEqual(evidence.value.truePositiveWeight, 0.095)).toBe(true);
    expect(approxEqual(evidence.value.falsePositiveWeight, 0.09)).toBe(true);
    expect(approxEqual(evidence.value.posterior, 0.5135135135135135)).toBe(true);
  });

  it("raises posterior when the prior prevalence is higher", () => {
    const lowPrior = bayesEvidence({
      prevalencePercent: 10,
      sensitivityPercent: 95,
      specificityPercent: 90,
    });
    const highPrior = bayesEvidence({
      prevalencePercent: 30,
      sensitivityPercent: 95,
      specificityPercent: 90,
    });

    expect(lowPrior.ok).toBe(true);
    expect(highPrior.ok).toBe(true);
    if (!lowPrior.ok) throw new Error(lowPrior.error.message);
    if (!highPrior.ok) throw new Error(highPrior.error.message);
    expect(highPrior.value.posterior).toBeGreaterThan(lowPrior.value.posterior);
    expect(approxEqual(highPrior.value.posterior, 0.8028169014084507)).toBe(true);
  });
});
