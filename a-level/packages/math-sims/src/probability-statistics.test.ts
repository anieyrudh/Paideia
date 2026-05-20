// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import { probabilityStatisticsModel } from "./probability-statistics.js";
import { runProbabilityStatisticsGateContract } from "./probability-statistics.contract.js";

const validState = fc.record({
  lowWeight: fc.integer({ min: 1, max: 12 }),
  typicalWeight: fc.integer({ min: 1, max: 12 }),
  highWeight: fc.integer({ min: 1, max: 12 }),
  highScore: fc.integer({ min: 6, max: 14 }),
  observedMean: fc.double({ min: 0, max: 14, noDefaultInfinity: true, noNaN: true }),
  sampleSize: fc.integer({ min: 16, max: 100 }),
});

describe("probability statistics sim", () => {
  it("normalises outcome weights and computes expected value and variance through the kernel", () => {
    const model = probabilityStatisticsModel({
      lowWeight: 3,
      typicalWeight: 5,
      highWeight: 2,
      highScore: 10,
      observedMean: 5.4,
      sampleSize: 36,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.probabilityTotal, 1)).toBe(true);
    expect(approxEqual(model.value.expectedScore, 4)).toBe(true);
    expect(approxEqual(model.value.variance, 12)).toBe(true);
    expect(approxEqual(model.value.standardDeviation, Math.sqrt(12))).toBe(true);
  });

  it("uses the z-score decision boundary for the observed sample mean", () => {
    const model = probabilityStatisticsModel({
      lowWeight: 3,
      typicalWeight: 5,
      highWeight: 2,
      highScore: 10,
      observedMean: 5.4,
      sampleSize: 36,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.decision.rejectNull).toBe(true);
    expect(model.value.decision.z).toBeGreaterThan(model.value.decision.criticalZ);
  });

  it("keeps the same observed mean inside the decision region for a smaller sample", () => {
    const model = probabilityStatisticsModel({
      lowWeight: 3,
      typicalWeight: 5,
      highWeight: 2,
      highScore: 10,
      observedMean: 5.4,
      sampleSize: 16,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.decision.rejectNull).toBe(false);
  });

  it("keeps normalised probabilities summing to one across valid controls", () => {
    fc.assert(
      fc.property(validState, (state) => {
        const model = probabilityStatisticsModel(state);

        expect(model.ok).toBe(true);
        if (!model.ok) return;
        expect(approxEqual(model.value.probabilityTotal, 1, 1e-10)).toBe(true);
        expect(model.value.variance).toBeGreaterThanOrEqual(0);
        expect(model.value.standardDeviation).toBeGreaterThanOrEqual(0);
        expect(model.value.decision.standardError).toBeGreaterThan(0);
      }),
      { seed: 20260520, numRuns: 80 },
    );
  });

  it("makes the same observed gap more extreme as sample size grows", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 6, max: 14 }),
        fc.double({ min: 0.2, max: 2, noDefaultInfinity: true, noNaN: true }),
        (lowWeight, typicalWeight, highWeight, highScore, gap) => {
          const baseline = probabilityStatisticsModel({
            lowWeight,
            typicalWeight,
            highWeight,
            highScore,
            observedMean: 0,
            sampleSize: 16,
          });
          expect(baseline.ok).toBe(true);
          if (!baseline.ok) return;

          const observedMean = Math.min(14, baseline.value.expectedScore + gap);
          const smallSample = probabilityStatisticsModel({
            lowWeight,
            typicalWeight,
            highWeight,
            highScore,
            observedMean,
            sampleSize: 16,
          });
          const largeSample = probabilityStatisticsModel({
            lowWeight,
            typicalWeight,
            highWeight,
            highScore,
            observedMean,
            sampleSize: 100,
          });

          expect(smallSample.ok).toBe(true);
          expect(largeSample.ok).toBe(true);
          if (!smallSample.ok || !largeSample.ok) return;
          expect(Math.abs(largeSample.value.decision.z)).toBeGreaterThanOrEqual(
            Math.abs(smallSample.value.decision.z),
          );
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runProbabilityStatisticsGateContract();
