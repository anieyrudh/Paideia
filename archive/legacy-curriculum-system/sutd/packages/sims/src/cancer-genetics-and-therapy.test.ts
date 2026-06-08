import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cancerEvidence } from "./cancer-genetics-and-therapy.js";

describe("cancerEvidence", () => {
  it("three drivers with s = 0.1 over 20 generations dominates the baseline", () => {
    const result = cancerEvidence({
      drivers: 3,
      perDriverAdvantage: 0.1,
      generations: 20,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clonalFitness).toBeCloseTo(Math.pow(1.1, 3), 6);
    expect(result.value.clonalRatio).toBeGreaterThan(100);
    expect(result.value.baselineSize).toBeCloseTo(10, 6);
  });

  it("zero drivers gives ratio of 1 (no advantage)", () => {
    const result = cancerEvidence({
      drivers: 0,
      perDriverAdvantage: 0.1,
      generations: 20,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clonalFitness).toBeCloseTo(1, 6);
    expect(result.value.clonalRatio).toBeCloseTo(1, 6);
  });

  it("at dose = 2 x IC50, susceptible response is 0.8 when n = 2", () => {
    const result = cancerEvidence({
      drivers: 1,
      perDriverAdvantage: 0.1,
      generations: 1,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // dose = 2 * IC50 => R = 4 / (1 + 4) = 0.8
    expect(result.value.responseAt2xIC50).toBeCloseTo(0.8, 6);
  });

  it("resistance factor 4 quadruples the required dose for 90 percent response", () => {
    const sus = cancerEvidence({
      drivers: 1,
      perDriverAdvantage: 0.1,
      generations: 1,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 1,
    });
    const res = cancerEvidence({
      drivers: 1,
      perDriverAdvantage: 0.1,
      generations: 1,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 4,
    });
    expect(sus.ok && res.ok).toBe(true);
    if (!sus.ok || !res.ok) return;
    expect(res.value.doseFor90Resistant / sus.value.doseFor90Susceptible).toBeCloseTo(4, 4);
  });

  it("rejects NaN inputs", () => {
    const result = cancerEvidence({
      drivers: Number.NaN,
      perDriverAdvantage: 0.1,
      generations: 20,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("preserves the closed-form growth and response invariants over valid inputs", () => {
    try {
      fc.assert(
        fc.property(
          fc.record({
            drivers: fc.integer({ min: 0, max: 5 }),
            perDriverAdvantage: fc.double({ min: 0, max: 0.4, noDefaultInfinity: true, noNaN: true }),
            generations: fc.integer({ min: 0, max: 40 }),
            ic50: fc.double({ min: 1, max: 100, noDefaultInfinity: true, noNaN: true }),
            hillCoefficient: fc.double({ min: 1, max: 4, noDefaultInfinity: true, noNaN: true }),
            resistanceFactor: fc.double({ min: 1, max: 8, noDefaultInfinity: true, noNaN: true }),
          }),
          (state) => {
            const result = cancerEvidence(state);
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.value.clonalFitness).toBeCloseTo(
              Math.pow(1 + state.perDriverAdvantage, state.drivers),
              6,
            );
            expect(result.value.clonalRatio).toBeGreaterThanOrEqual(1);
            expect(result.value.effectiveIc50).toBeCloseTo(state.ic50 * state.resistanceFactor, 6);
            expect(result.value.responseAt2xIC50).toBeGreaterThan(0);
            expect(result.value.responseAt2xIC50).toBeLessThan(1);
            expect(result.value.doseFor90Resistant / result.value.doseFor90Susceptible).toBeCloseTo(
              state.resistanceFactor,
              4,
            );
          },
        ),
        { seed: 239001, numRuns: 200, verbose: true },
      );
    } catch (error) {
      console.error("cancerEvidence property failed with fast-check seed 239001", error);
      throw error;
    }
  });

  it("rejects NaN values across every numeric field", () => {
    const base = {
      drivers: 1,
      perDriverAdvantage: 0.1,
      generations: 10,
      ic50: 10,
      hillCoefficient: 2,
      resistanceFactor: 2,
    };

    for (const field of Object.keys(base) as Array<keyof typeof base>) {
      const result = cancerEvidence({ ...base, [field]: Number.NaN });
      expect(result.ok).toBe(false);
    }
  });
});
