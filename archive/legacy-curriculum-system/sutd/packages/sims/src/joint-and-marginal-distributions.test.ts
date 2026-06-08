import { describe, expect, it } from "vitest";

import { jointMarginalModel } from "./joint-and-marginal-distributions.js";

describe("jointMarginalModel", () => {
  it("keeps independent conditional probability equal to the marginal", () => {
    const result = jointMarginalModel({ eventA: 0.4, eventB: 0.5, association: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.marginalA).toBeCloseTo(0.4);
    expect(result.value.marginalB).toBeCloseTo(0.5);
    expect(result.value.conditionalAGivenB).toBeCloseTo(0.4);
  });

  it("raises P(A|B) under positive association", () => {
    const result = jointMarginalModel({ eventA: 0.4, eventB: 0.5, association: 0.6 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conditionalAGivenB).toBeGreaterThan(result.value.marginalA);
    expect(result.value.distribution.reduce((sum, cell) => sum + Number(cell.probability), 0)).toBeCloseTo(1);
  });
});
