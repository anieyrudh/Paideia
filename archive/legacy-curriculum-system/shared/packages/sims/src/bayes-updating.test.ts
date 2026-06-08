import { describe, expect, it } from "vitest";
import { bayesEvidence } from "./bayes-updating.js";

describe("bayes-updating sim model", () => {
  it("normalizes positive evidence into the expected posterior", () => {
    const evidence = bayesEvidence({
      prevalencePercent: 10,
      sensitivityPercent: 95,
      specificityPercent: 90,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;

    expect(evidence.value.truePositiveWeight).toBeCloseTo(0.095);
    expect(evidence.value.falsePositiveWeight).toBeCloseTo(0.09);
    expect(evidence.value.posterior).toBeCloseTo(0.5135, 4);
  });

  it("raises the posterior when the prior becomes common", () => {
    const evidence = bayesEvidence({
      prevalencePercent: 30,
      sensitivityPercent: 95,
      specificityPercent: 90,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;

    expect(evidence.value.posterior).toBeCloseTo(0.8028, 4);
  });
});
