// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  confidenceIntervalsModel,
  type ConfidenceIntervalsState,
} from "./confidence-intervals.js";
import { runConfidenceIntervalsGateContract } from "./confidence-intervals.contract.js";

const validState: fc.Arbitrary<ConfidenceIntervalsState> = fc.record({
  sampleMean: fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
  populationStandardDeviation: fc.double({ min: 4, max: 16, noDefaultInfinity: true, noNaN: true }),
  sampleSize: fc.integer({ min: 16, max: 100 }),
  confidenceLevel: fc.constantFrom(0.9 as const, 0.95 as const, 0.99 as const),
  comparisonMean: fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
});

describe("confidence intervals sim", () => {
  it("computes standard error and interval bounds through the probability-stats kernel", () => {
    const model = confidenceIntervalsModel({
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 36,
      confidenceLevel: 0.95,
      comparisonMean: 65,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.standardError, 9 / 6)).toBe(true);
    expect(model.value.criticalMultiplier).toBe(1.96);
    expect(approxEqual(model.value.marginOfError, 2.94)).toBe(true);
    expect(approxEqual(model.value.lowerBound, 65.06)).toBe(true);
    expect(approxEqual(model.value.upperBound, 70.94)).toBe(true);
  });

  it("reports whether a comparison mean lies inside the interval", () => {
    const inside = confidenceIntervalsModel({
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 36,
      confidenceLevel: 0.95,
      comparisonMean: 65.1,
    });
    const outside = confidenceIntervalsModel({
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 36,
      confidenceLevel: 0.95,
      comparisonMean: 65,
    });

    expect(inside.ok).toBe(true);
    expect(outside.ok).toBe(true);
    if (!inside.ok || !outside.ok) return;
    expect(inside.value.containsComparisonMean).toBe(true);
    expect(outside.value.containsComparisonMean).toBe(false);
  });

  it("widens the interval when confidence level increases with the same standard error", () => {
    const base = {
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 36,
      comparisonMean: 65,
    } as const;
    const ninety = confidenceIntervalsModel({ ...base, confidenceLevel: 0.9 });
    const ninetyNine = confidenceIntervalsModel({ ...base, confidenceLevel: 0.99 });

    expect(ninety.ok).toBe(true);
    expect(ninetyNine.ok).toBe(true);
    if (!ninety.ok || !ninetyNine.ok) return;
    expect(ninetyNine.value.marginOfError).toBeGreaterThan(ninety.value.marginOfError);
  });

  it("valid controls always produce finite interval quantities", () => {
    fc.assert(
      fc.property(validState, (state) => {
        const model = confidenceIntervalsModel(state);

        expect(model.ok).toBe(true);
        if (!model.ok) return;
        expect(Number.isFinite(model.value.standardError)).toBe(true);
        expect(Number.isFinite(model.value.marginOfError)).toBe(true);
        expect(model.value.upperBound).toBeGreaterThan(model.value.lowerBound);
        expect(model.value.standardError).toBeGreaterThan(0);
      }),
      { seed: 20260521, numRuns: 80 },
    );
  });

  it("narrows the same confidence interval as sample size grows", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 80, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 4, max: 16, noDefaultInfinity: true, noNaN: true }),
        fc.constantFrom(0.9 as const, 0.95 as const, 0.99 as const),
        (sampleMean, populationStandardDeviation, confidenceLevel) => {
          const smallSample = confidenceIntervalsModel({
            sampleMean,
            populationStandardDeviation,
            sampleSize: 16,
            confidenceLevel,
            comparisonMean: sampleMean,
          });
          const largeSample = confidenceIntervalsModel({
            sampleMean,
            populationStandardDeviation,
            sampleSize: 100,
            confidenceLevel,
            comparisonMean: sampleMean,
          });

          expect(smallSample.ok).toBe(true);
          expect(largeSample.ok).toBe(true);
          if (!smallSample.ok || !largeSample.ok) return;
          expect(largeSample.value.marginOfError).toBeLessThanOrEqual(
            smallSample.value.marginOfError,
          );
        },
      ),
      { seed: 20260522, numRuns: 80 },
    );
  });
});

runConfidenceIntervalsGateContract();
