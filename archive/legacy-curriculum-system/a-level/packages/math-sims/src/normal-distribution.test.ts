// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  normalDistributionModel,
  type NormalDistributionState,
} from "./normal-distribution.js";
import { runNormalDistributionGateContract } from "./normal-distribution.contract.js";

const validState: fc.Arbitrary<NormalDistributionState> = fc.record({
  mean: fc.double({ min: 60, max: 140, noDefaultInfinity: true, noNaN: true }),
  standardDeviation: fc.double({ min: 4, max: 24, noDefaultInfinity: true, noNaN: true }),
  lowerBound: fc.double({ min: 40, max: 160, noDefaultInfinity: true, noNaN: true }),
  upperBound: fc.double({ min: 40, max: 160, noDefaultInfinity: true, noNaN: true }),
  mode: fc.constantFrom("between" as const, "left-tail" as const, "right-tail" as const),
});

describe("normal distribution sim", () => {
  it("standardises raw marks through the probability-stats z-score kernel", () => {
    const model = normalDistributionModel({
      mean: 100,
      standardDeviation: 12,
      lowerBound: 88,
      upperBound: 112,
      mode: "between",
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.zLower, -1)).toBe(true);
    expect(approxEqual(model.value.zUpper, 1)).toBe(true);
  });

  it("computes the familiar central one-standard-deviation area", () => {
    const model = normalDistributionModel({
      mean: 100,
      standardDeviation: 12,
      lowerBound: 88,
      upperBound: 112,
      mode: "between",
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.probability, 0.6827, 0.001)).toBe(true);
    expect(model.value.probabilityLabel).toBe("68.3%");
  });

  it("shrinks the right-tail probability as the cutoff moves higher", () => {
    const nearer = normalDistributionModel({
      mean: 100,
      standardDeviation: 12,
      lowerBound: 88,
      upperBound: 112,
      mode: "right-tail",
    });
    const farther = normalDistributionModel({
      mean: 100,
      standardDeviation: 12,
      lowerBound: 88,
      upperBound: 124,
      mode: "right-tail",
    });

    expect(nearer.ok).toBe(true);
    expect(farther.ok).toBe(true);
    if (!nearer.ok || !farther.ok) return;
    expect(farther.value.probability).toBeLessThan(nearer.value.probability);
    expect(approxEqual(farther.value.probability, 0.0228, 0.001)).toBe(true);
  });

  it("keeps valid controls inside finite probability bounds", () => {
    fc.assert(
      fc.property(validState, (state) => {
        const model = normalDistributionModel(state);

        expect(model.ok).toBe(true);
        if (!model.ok) return;
        expect(Number.isFinite(model.value.zLower)).toBe(true);
        expect(Number.isFinite(model.value.zUpper)).toBe(true);
        expect(model.value.probability).toBeGreaterThanOrEqual(0);
        expect(model.value.probability).toBeLessThanOrEqual(1);
        expect(model.value.density.length).toBeGreaterThan(80);
      }),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runNormalDistributionGateContract();
