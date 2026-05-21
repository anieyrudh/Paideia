// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import { hypothesisTestingModel } from "./hypothesis-testing.js";
import { runHypothesisTestingGateContract } from "./hypothesis-testing.contract.js";

const validState = fc.record({
  nullMean: fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
  observedMean: fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
  populationStandardDeviation: fc.double({ min: 4, max: 16, noDefaultInfinity: true, noNaN: true }),
  sampleSize: fc.integer({ min: 16, max: 100 }),
  alpha: fc.constantFrom(0.1, 0.05, 0.01),
  tail: fc.constantFrom("greater" as const, "less" as const, "two-sided" as const),
});

describe("hypothesis testing sim", () => {
  it("computes standard error and z-score through the probability-stats kernel", () => {
    const model = hypothesisTestingModel({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 36,
      alpha: 0.05,
      tail: "greater",
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.decision.standardError, 8 / 6)).toBe(true);
    expect(approxEqual(model.value.decision.z, 2.4)).toBe(true);
  });

  it("rejects in the one-tailed critical region and reports the p-value comparison", () => {
    const model = hypothesisTestingModel({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 36,
      alpha: 0.05,
      tail: "greater",
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.decision.criticalRegion).toBe("z >= 1.645");
    expect(model.value.decision.rejectNull).toBe(true);
    expect(model.value.decision.pValueComparison).toBe("p < 5%");
  });

  it("keeps the same observed gap outside the decision region for a smaller sample", () => {
    const model = hypothesisTestingModel({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 16,
      alpha: 0.05,
      tail: "greater",
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.decision.rejectNull).toBe(false);
    expect(model.value.decision.pValueComparison).toBe("p >= 5%");
  });

  it("valid controls always produce finite decision quantities", () => {
    fc.assert(
      fc.property(validState, (state) => {
        const model = hypothesisTestingModel(state);

        expect(model.ok).toBe(true);
        if (!model.ok) return;
        expect(Number.isFinite(model.value.decision.standardError)).toBe(true);
        expect(Number.isFinite(model.value.decision.z)).toBe(true);
        expect(model.value.decision.standardError).toBeGreaterThan(0);
      }),
      { seed: 20260521, numRuns: 80 },
    );
  });

  it("makes the same observed gap more extreme as sample size grows", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 4, max: 16, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.5, max: 4, noDefaultInfinity: true, noNaN: true }),
        (nullMean, populationStandardDeviation, gap) => {
          const smallSample = hypothesisTestingModel({
            nullMean,
            observedMean: Math.min(80, nullMean + gap),
            populationStandardDeviation,
            sampleSize: 16,
            alpha: 0.05,
            tail: "greater",
          });
          const largeSample = hypothesisTestingModel({
            nullMean,
            observedMean: Math.min(80, nullMean + gap),
            populationStandardDeviation,
            sampleSize: 100,
            alpha: 0.05,
            tail: "greater",
          });

          expect(smallSample.ok).toBe(true);
          expect(largeSample.ok).toBe(true);
          if (!smallSample.ok || !largeSample.ok) return;
          expect(Math.abs(largeSample.value.decision.z)).toBeGreaterThanOrEqual(
            Math.abs(smallSample.value.decision.z),
          );
        },
      ),
      { seed: 20260522, numRuns: 80 },
    );
  });
});

runHypothesisTestingGateContract();
