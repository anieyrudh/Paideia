import { describe, expect, it } from "vitest";

import { continuousRvsModel } from "./continuous-rvs-uniform-exponential.js";

describe("continuousRvsModel", () => {
  it("computes uniform interval area, mean, and variance", () => {
    const result = continuousRvsModel({
      model: "uniform",
      min: 2,
      max: 8,
      lower: 3,
      upper: 6,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mean).toBeCloseTo(5);
    expect(result.value.variance).toBeCloseTo(3);
    expect(result.value.intervalProbability).toBeCloseTo(0.5);
  });

  it("computes exponential CDF differences and moments", () => {
    const result = continuousRvsModel({
      model: "exponential",
      rate: 0.5,
      lower: 1,
      upper: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mean).toBeCloseTo(2);
    expect(result.value.variance).toBeCloseTo(4);
    expect(result.value.intervalProbability).toBeCloseTo(Math.exp(-0.5) - Math.exp(-1.5));
  });
});
