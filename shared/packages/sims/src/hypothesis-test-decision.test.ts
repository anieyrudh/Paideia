// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { hypothesisTestDecisionModel } from "./hypothesis-test-decision.js";

describe("hypothesis-test-decision sim model", () => {
  it("keeps the default scenario outside the upper-tail rejection region", () => {
    const result = hypothesisTestDecisionModel({
      nullMean: 50,
      observedMean: 51.3,
      populationStandardDeviation: 6,
      sampleSize: 36,
      alpha: 0.05,
      alternative: "greater",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approxEqual(result.value.standardError, 1, 1e-12)).toBe(true);
    expect(approxEqual(result.value.z, 1.3, 1e-12)).toBe(true);
    expect(result.value.rejectNull).toBe(false);
    expect(result.value.decisionLabel).toBe("Do not reject the null hypothesis");
  });

  it("changes decision when the same mean has a smaller standard error", () => {
    const result = hypothesisTestDecisionModel({
      nullMean: 50,
      observedMean: 51.3,
      populationStandardDeviation: 6,
      sampleSize: 64,
      alpha: 0.05,
      alternative: "greater",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approxEqual(result.value.standardError, 0.75, 1e-12)).toBe(true);
    expect(result.value.rejectNull).toBe(true);
    expect(result.value.pValueRelation).toBe("less-than-alpha");
  });

  it("uses lower-tail and two-sided boundaries from the probability kernel", () => {
    const lower = hypothesisTestDecisionModel({
      nullMean: 50,
      observedMean: 48.3,
      populationStandardDeviation: 5,
      sampleSize: 36,
      alpha: 0.05,
      alternative: "less",
    });
    const twoSided = hypothesisTestDecisionModel({
      nullMean: 50,
      observedMean: 52,
      populationStandardDeviation: 6,
      sampleSize: 36,
      alpha: 0.05,
      alternative: "two-sided",
    });

    expect(lower.ok).toBe(true);
    expect(twoSided.ok).toBe(true);
    if (!lower.ok || !twoSided.ok) return;
    expect(lower.value.rejectNull).toBe(true);
    expect(approxEqual(twoSided.value.criticalBoundary, 1.96, 1e-12)).toBe(true);
    expect(twoSided.value.rejectNull).toBe(true);
  });
});
