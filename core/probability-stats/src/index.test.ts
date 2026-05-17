import { probability } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  expectedValue,
  histogram,
  normalizeDistribution,
  probabilityStatsTolerance,
  quantile,
  summarize,
  variance,
  zScore,
  type DiscreteDistribution,
} from "./index.js";

const p = (value: number) => {
  const result = probability(value);
  if (!result.ok) throw new Error(`Invalid test probability ${value}`);
  return result.value;
};

describe("@paideia/probability-stats", () => {
  it("normalizes finite non-negative weights without mutating inputs", () => {
    const outcomes = [
      { id: "a", weight: 2, value: 1 },
      { id: "b", weight: 3, value: 5 },
    ] as const;
    const before = JSON.stringify(outcomes);

    const result = normalizeDistribution(outcomes);

    expect(JSON.stringify(outcomes)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Number(result.value[0]?.probability)).toBeCloseTo(0.4, 12);
      expect(Number(result.value[1]?.probability)).toBeCloseTo(0.6, 12);
    }
  });

  it("rejects invalid weights and zero total mass", () => {
    const negative = normalizeDistribution([{ id: "bad", weight: -1, value: 0 }]);
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.error.code).toBe("out-of-domain");

    const zero = normalizeDistribution([{ id: "zero", weight: 0, value: 0 }]);
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.error.code).toBe("out-of-domain");
  });

  it("normalizes very large finite weights without overflowing mass", () => {
    const result = normalizeDistribution([
      { id: "huge-a", weight: Number.MAX_VALUE, value: 1 },
      { id: "huge-b", weight: Number.MAX_VALUE, value: 2 },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Number(result.value[0]?.probability)).toBeCloseTo(0.5, 12);
      expect(Number(result.value[1]?.probability)).toBeCloseTo(0.5, 12);
      const totalMass = result.value.reduce(
        (total, outcome) => total + Number(outcome.probability),
        0,
      );
      expect(totalMass).toBeCloseTo(1, 12);
    }
  });

  it("computes expected value and variance for a discrete distribution", () => {
    const distribution: DiscreteDistribution = [
      { id: "one", probability: p(0.25), value: 1 },
      { id: "three", probability: p(0.75), value: 3 },
    ];

    const mean = expectedValue(distribution);
    const spread = variance(distribution);

    expect(mean.ok).toBe(true);
    if (mean.ok) expect(mean.value).toBeCloseTo(2.5, 12);
    expect(spread.ok).toBe(true);
    if (spread.ok) expect(spread.value).toBeCloseTo(0.75, 12);
  });

  it("returns errors instead of non-finite derived moments", () => {
    const hugeDistribution: DiscreteDistribution = [
      { id: "low", probability: p(0.5), value: -Number.MAX_VALUE },
      { id: "high", probability: p(0.5), value: Number.MAX_VALUE },
    ];

    const mean = expectedValue(hugeDistribution);
    expect(mean.ok).toBe(true);
    if (mean.ok) expect(Number.isFinite(mean.value)).toBe(true);

    const spread = variance(hugeDistribution);
    expect(spread.ok).toBe(false);
    if (!spread.ok) expect(spread.error.code).toBe("numerical-instability");
  });

  it("rejects distributions whose branded probabilities do not sum to one", () => {
    const result = expectedValue([
      { id: "a", probability: p(0.2), value: 1 },
      { id: "b", probability: p(0.2), value: 2 },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("summarizes samples and populations", () => {
    const sample = summarize([1, 2, 3, 4]);
    expect(sample.ok).toBe(true);
    if (sample.ok) {
      expect(sample.value.count).toBe(4);
      expect(sample.value.mean).toBe(2.5);
      expect(sample.value.variance).toBeCloseTo(5 / 3, 12);
      expect(sample.value.standardDeviation).toBeCloseTo(Math.sqrt(5 / 3), 12);
      expect(sample.value.min).toBe(1);
      expect(sample.value.max).toBe(4);
    }

    const population = summarize([1, 2, 3, 4], { variance: "population" });
    expect(population.ok).toBe(true);
    if (population.ok) expect(population.value.variance).toBeCloseTo(1.25, 12);
  });

  it("rejects sample variance for a singleton", () => {
    const result = summarize([2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects non-finite summary outputs from extreme finite inputs", () => {
    const result = summarize([Number.MAX_VALUE, -Number.MAX_VALUE]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
  });

  it("computes interpolated quantiles without mutating values", () => {
    const values = [10, 0, 30, 20] as const;
    const before = JSON.stringify(values);

    const median = quantile(values, p(0.5));
    const upper = quantile(values, p(0.75));

    expect(JSON.stringify(values)).toBe(before);
    expect(median.ok).toBe(true);
    if (median.ok) expect(median.value).toBe(15);
    expect(upper.ok).toBe(true);
    if (upper.ok) expect(upper.value).toBe(22.5);
  });

  it("computes z-scores and rejects non-positive standard deviation", () => {
    const score = zScore(13, 10, 2);
    expect(score.ok).toBe(true);
    if (score.ok) expect(score.value).toBe(1.5);

    const invalid = zScore(13, 10, 0);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe("out-of-domain");
  });

  it("bins histograms and preserves density mass", () => {
    const result = histogram([0, 1, 2, 3], { binCount: 2, domain: { min: 0, max: 4 } });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((bin) => bin.count)).toEqual([2, 2]);
      const integratedDensity = result.value.reduce(
        (total, bin) => total + bin.density * (bin.max - bin.min),
        0,
      );
      expect(integratedDensity).toBeCloseTo(1, 12);
    }
  });

  it("rejects histogram values outside an explicit domain", () => {
    const result = histogram([0, 1, 5], { binCount: 2, domain: { min: 0, max: 4 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("preserves distribution mass and non-negative variance across generated weights", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const outcomes = Array.from({ length: 5 }, (_, index) => ({
        id: `o-${seed}-${index}`,
        weight: ((seed * (index + 3)) % 17) + 1,
        value: seed / 10 + index,
      }));

      const distribution = normalizeDistribution(outcomes);
      expect(distribution.ok).toBe(true);
      if (!distribution.ok) continue;

      const totalMass = distribution.value.reduce(
        (total, outcome) => total + Number(outcome.probability),
        0,
      );
      expect(Math.abs(totalMass - 1)).toBeLessThan(probabilityStatsTolerance.default);

      const spread = variance(distribution.value);
      expect(spread.ok).toBe(true);
      if (spread.ok) expect(spread.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps summary mean invariant under observation order", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const values = Array.from(
        { length: 8 },
        (_, index) => Math.sin(seed + index) * 10 + index,
      );
      const forward = summarize(values);
      const backward = summarize([...values].reverse());

      expect(forward.ok).toBe(true);
      expect(backward.ok).toBe(true);
      if (forward.ok && backward.ok) {
        expect(forward.value.mean).toBeCloseTo(backward.value.mean, 12);
        expect(forward.value.variance).toBeCloseTo(backward.value.variance, 12);
      }
    }
  });
});
