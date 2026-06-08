// @vitest-environment jsdom

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildLinearProgrammingModel,
  defaultLinearProgrammingState,
  type LinearProgrammingState,
} from "./linear-programming-feasible-region.js";

describe("linear-programming-feasible-region sim model", () => {
  it("uses the optimization kernel to choose the best feasible corner", () => {
    const result = buildLinearProgrammingModel(defaultLinearProgrammingState);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solution.point[0]).toBeCloseTo(6);
    expect(result.value.solution.point[1]).toBeCloseTo(2);
    expect(result.value.solution.value).toBeCloseTo(22);
    expect(result.value.interpretation).toContain("corner");
  });

  it("keeps an infeasible test point separate from the feasible optimum", () => {
    const result = buildLinearProgrammingModel({
      ...defaultLinearProgrammingState,
      assemblyLimit: 8,
      laborLimit: 10,
      materialLimit: 12,
      testX: 7,
      testY: 4,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.testFeasible).toBe(false);
    expect(result.value.solution.point[0]).toBeLessThanOrEqual(8);
    expect(result.value.solution.point[1]).toBeLessThanOrEqual(8);
  });

  it("returns finite kernel-backed optima across generated bounded LPs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 14 }),
        fc.integer({ min: 10, max: 18 }),
        fc.integer({ min: 12, max: 24 }),
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 2, max: 12 }),
        (assemblyLimit, laborLimit, materialLimit, profitXHalf, profitYHalf) => {
          const state: LinearProgrammingState = {
            ...defaultLinearProgrammingState,
            assemblyLimit,
            laborLimit,
            materialLimit,
            profitX: profitXHalf / 2,
            profitY: profitYHalf / 2,
          };
          const result = buildLinearProgrammingModel(state);

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(Number.isFinite(result.value.solution.value)).toBe(true);
          expect(result.value.solution.point[0]).toBeGreaterThanOrEqual(0);
          expect(result.value.solution.point[1]).toBeGreaterThanOrEqual(0);
          expect(result.value.solution.point[0]).toBeLessThanOrEqual(10);
          expect(result.value.solution.point[1]).toBeLessThanOrEqual(10);
        },
      ),
      { seed: 522, numRuns: 40 },
    );
  });
});
