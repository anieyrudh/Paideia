import { approxEqual, probability } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  bayesPositiveEvidence,
  expectedValue,
  histogram,
  normalMeanHypothesisTest,
  normalizeDistribution,
  probabilityStatsTolerance,
  quantile,
  samplingDistributionOfMean,
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
  it("computes a positive-evidence Bayes update through normalized routes", () => {
    const result = bayesPositiveEvidence({
      prior: p(0.1),
      sensitivity: p(0.95),
      specificity: p(0.9),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.truePositiveWeight).toBeCloseTo(0.095);
      expect(result.value.falsePositiveWeight).toBeCloseTo(0.09);
      expect(Number(result.value.posterior)).toBeCloseTo(0.5135, 4);
      const totalMass = result.value.routes.reduce(
        (total, outcome) => total + Number(outcome.probability),
        0,
      );
      expect(approxEqual(totalMass, 1, probabilityStatsTolerance.tight)).toBe(true);
    }
  });

  it("rejects a positive-evidence Bayes update with no positive route mass", () => {
    const result = bayesPositiveEvidence({
      prior: p(0),
      sensitivity: p(0),
      specificity: p(1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

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
      expect(approxEqual(Number(result.value[0]?.probability), 0.4, probabilityStatsTolerance.tight)).toBe(true);
      expect(approxEqual(Number(result.value[1]?.probability), 0.6, probabilityStatsTolerance.tight)).toBe(true);
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
      expect(approxEqual(Number(result.value[0]?.probability), 0.5, probabilityStatsTolerance.tight)).toBe(true);
      expect(approxEqual(Number(result.value[1]?.probability), 0.5, probabilityStatsTolerance.tight)).toBe(true);
      const totalMass = result.value.reduce(
        (total, outcome) => total + Number(outcome.probability),
        0,
      );
      expect(approxEqual(totalMass, 1, probabilityStatsTolerance.tight)).toBe(true);
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
    if (mean.ok) expect(approxEqual(mean.value, 2.5, probabilityStatsTolerance.tight)).toBe(true);
    expect(spread.ok).toBe(true);
    if (spread.ok) expect(approxEqual(spread.value, 0.75, probabilityStatsTolerance.tight)).toBe(true);
  });

  it("computes a sampling distribution of means from caller-owned thresholds", () => {
    const distribution: DiscreteDistribution = [
      { id: "low", probability: p(0.5), value: 0 },
      { id: "high", probability: p(0.5), value: 10 },
    ];

    const result = samplingDistributionOfMean({
      distribution,
      thresholdSamples: [
        [0.1, 0.2],
        [0.8, 0.9],
        [0.1, 0.9],
      ],
      histogramBinCount: 3,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sampleMeans).toEqual([0, 10, 5]);
      expect(approxEqual(result.value.populationMean, 5, probabilityStatsTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.standardError, 2.5 * Math.SQRT2, probabilityStatsTolerance.tight)).toBe(true);
      expect(result.value.histogram.length).toBe(3);
    }
  });

  it("rejects invalid sampling distribution thresholds and ragged samples", () => {
    const distribution: DiscreteDistribution = [
      { id: "low", probability: p(0.5), value: 0 },
      { id: "high", probability: p(0.5), value: 10 },
    ];

    const invalidThreshold = samplingDistributionOfMean({
      distribution,
      thresholdSamples: [[1.2]],
    });
    expect(invalidThreshold.ok).toBe(false);
    if (!invalidThreshold.ok) expect(invalidThreshold.error.code).toBe("out-of-domain");

    const ragged = samplingDistributionOfMean({
      distribution,
      thresholdSamples: [[0.2, 0.4], [0.6]],
    });
    expect(ragged.ok).toBe(false);
    if (!ragged.ok) expect(ragged.error.code).toBe("precondition-violated");
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
      expect(approxEqual(sample.value.variance, 5 / 3, probabilityStatsTolerance.tight)).toBe(true);
      expect(approxEqual(sample.value.standardDeviation, Math.sqrt(5 / 3), probabilityStatsTolerance.tight)).toBe(true);
      expect(sample.value.min).toBe(1);
      expect(sample.value.max).toBe(4);
    }

    const population = summarize([1, 2, 3, 4], { variance: "population" });
    expect(population.ok).toBe(true);
    if (population.ok) expect(approxEqual(population.value.variance, 1.25, probabilityStatsTolerance.tight)).toBe(true);
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

    const overflowing = zScore(Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE);
    expect(overflowing.ok).toBe(false);
    if (!overflowing.ok) expect(overflowing.error.code).toBe("numerical-instability");
  });

  it("computes a normal mean hypothesis-test decision", () => {
    const result = normalMeanHypothesisTest({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 36,
      alpha: 0.05,
      alternative: "greater",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.standardError, 8 / 6, probabilityStatsTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.z, 2.4, probabilityStatsTolerance.tight)).toBe(true);
      expect(result.value.criticalBoundary).toBe(1.645);
      expect(result.value.rejectNull).toBe(true);
      expect(result.value.pValueRelation).toBe("less-than-alpha");
    }
  });

  it("handles two-sided and lower-tail normal mean hypothesis-test decisions", () => {
    const twoSided = normalMeanHypothesisTest({
      nullMean: 70,
      observedMean: 66.7,
      populationStandardDeviation: 9,
      sampleSize: 49,
      alpha: 0.05,
      alternative: "two-sided",
    });
    expect(twoSided.ok).toBe(true);
    if (twoSided.ok) {
      expect(twoSided.value.criticalBoundary).toBe(1.96);
      expect(twoSided.value.rejectNull).toBe(true);
    }

    const lowerTail = normalMeanHypothesisTest({
      nullMean: 70,
      observedMean: 68,
      populationStandardDeviation: 10,
      sampleSize: 25,
      alpha: 0.01,
      alternative: "less",
    });
    expect(lowerTail.ok).toBe(true);
    if (lowerTail.ok) {
      expect(lowerTail.value.criticalBoundary).toBe(2.326);
      expect(lowerTail.value.rejectNull).toBe(false);
      expect(lowerTail.value.pValueRelation).toBe("at-least-alpha");
    }
  });

  it("rejects invalid normal mean hypothesis-test inputs", () => {
    const invalidSpread = normalMeanHypothesisTest({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 0,
      sampleSize: 36,
      alpha: 0.05,
      alternative: "greater",
    });
    expect(invalidSpread.ok).toBe(false);
    if (!invalidSpread.ok) expect(invalidSpread.error.code).toBe("out-of-domain");

    const invalidSample = normalMeanHypothesisTest({
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 36.5,
      alpha: 0.05,
      alternative: "greater",
    });
    expect(invalidSample.ok).toBe(false);
    if (!invalidSample.ok) expect(invalidSample.error.code).toBe("precondition-violated");
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
      expect(approxEqual(integratedDensity, 1, probabilityStatsTolerance.tight)).toBe(true);
    }
  });

  it("rejects histogram values outside an explicit domain", () => {
    const result = histogram([0, 1, 5], { binCount: 2, domain: { min: 0, max: 4 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects histogram densities that cannot remain finite", () => {
    const result = histogram([0, Number.MIN_VALUE], {
      binCount: 2,
      domain: { min: 0, max: Number.MIN_VALUE },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
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
      expect(approxEqual(totalMass, 1, probabilityStatsTolerance.default)).toBe(true);

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
        expect(approxEqual(forward.value.mean, backward.value.mean, probabilityStatsTolerance.tight)).toBe(true);
        expect(approxEqual(forward.value.variance, backward.value.variance, probabilityStatsTolerance.tight)).toBe(true);
      }
    }
  });
});
