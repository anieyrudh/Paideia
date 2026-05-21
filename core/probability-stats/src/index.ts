import {
  err,
  ok,
  probability,
  type Interval,
  type KernelResult,
  type Probability,
} from "@paideia/shared";

export interface WeightedOutcome<TId extends string = string> {
  readonly id: TId;
  readonly weight: number;
  readonly value: number;
}

export interface DistributionOutcome<TId extends string = string> {
  readonly id: TId;
  readonly probability: Probability;
  readonly value: number;
}

export type DiscreteDistribution<TId extends string = string> = readonly DistributionOutcome<TId>[];

export type VarianceMode = "population" | "sample";

export interface SummaryStats {
  readonly count: number;
  readonly mean: number;
  readonly variance: number;
  readonly standardDeviation: number;
  readonly min: number;
  readonly max: number;
}

export interface HistogramBin {
  readonly min: number;
  readonly max: number;
  readonly count: number;
  readonly density: number;
}

export interface SamplingDistributionOfMeanInput {
  readonly distribution: DiscreteDistribution;
  readonly thresholdSamples: readonly (readonly number[])[];
  readonly histogramBinCount?: number;
}

export interface SamplingDistributionOfMean {
  readonly populationMean: number;
  readonly populationVariance: number;
  readonly populationStandardDeviation: number;
  readonly standardError: number;
  readonly sampleMeans: readonly number[];
  readonly sampleMeanSummary: SummaryStats;
  readonly histogram: readonly HistogramBin[];
}

export interface BayesPositiveEvidenceInput {
  readonly prior: Probability;
  readonly sensitivity: Probability;
  readonly specificity: Probability;
}

export interface BayesPositiveEvidence {
  readonly prior: Probability;
  readonly complementPrior: Probability;
  readonly sensitivity: Probability;
  readonly specificity: Probability;
  readonly falsePositiveRate: Probability;
  readonly truePositiveWeight: number;
  readonly falsePositiveWeight: number;
  readonly posterior: Probability;
  readonly routes: DiscreteDistribution<"true-positive" | "false-positive">;
}

export type BinaryClassLabel = "actual-positive" | "actual-negative";

export interface ThresholdClassifierCase<TId extends string = string> {
  readonly id: TId;
  readonly score: number;
  readonly actual: BinaryClassLabel;
}

export interface BinaryConfusionCounts {
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly trueNegative: number;
  readonly falseNegative: number;
}

export type BinaryConfusionCell =
  | "true-positive"
  | "false-positive"
  | "true-negative"
  | "false-negative";

export interface ThresholdCaseOutcome<TId extends string = string> {
  readonly id: TId;
  readonly score: number;
  readonly actual: BinaryClassLabel;
  readonly predictedPositive: boolean;
  readonly cell: BinaryConfusionCell;
}

export interface ThresholdCurvePoint {
  readonly thresholdPercent: number;
  readonly precision: number;
  readonly recall: number;
  readonly accuracy: number;
  readonly falsePositiveCostTotal: number;
  readonly falseNegativeCostTotal: number;
  readonly totalCost: number;
}

export interface ThresholdClassificationInput<TId extends string = string> {
  readonly cases: readonly ThresholdClassifierCase<TId>[];
  readonly threshold: number;
  readonly falsePositiveCost: number;
  readonly falseNegativeCost: number;
  readonly curveThresholds?: readonly number[];
}

export interface ThresholdClassificationEvidence {
  readonly threshold: Probability;
  readonly counts: BinaryConfusionCounts;
  readonly precision: Probability;
  readonly recall: Probability;
  readonly accuracy: Probability;
  readonly baseRate: Probability;
  readonly falsePositiveCost: number;
  readonly falseNegativeCost: number;
  readonly falsePositiveCostTotal: number;
  readonly falseNegativeCostTotal: number;
  readonly totalCost: number;
  readonly curve: readonly ThresholdCurvePoint[];
}

export const probabilityStatsTolerance = {
  default: 1e-10,
  tight: 1e-12,
  loose: 1e-8,
} as const;

const finite = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteOutput = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed to a non-finite value`);

const validateValues = (
  values: readonly number[],
  label: string,
): KernelResult<readonly number[]> => {
  if (values.length === 0) {
    return err("precondition-violated", `${label} requires at least one value`);
  }

  for (const value of values) {
    const valid = finite(value, label);
    if (!valid.ok) return valid;
  }

  return ok(values);
};

const validateDistribution = (
  distribution: DiscreteDistribution,
): KernelResult<DiscreteDistribution> => {
  if (distribution.length === 0) {
    return err("precondition-violated", "Distribution requires at least one outcome");
  }

  let totalProbability = 0;
  for (const outcome of distribution) {
    const value = finite(outcome.value, `Outcome ${outcome.id} value`);
    if (!value.ok) return value;

    const probabilityValue = Number(outcome.probability);
    const validProbability = probability(probabilityValue);
    if (!validProbability.ok) return validProbability;
    totalProbability += probabilityValue;
  }

  if (Math.abs(totalProbability - 1) > probabilityStatsTolerance.default) {
    return err(
      "precondition-violated",
      `Distribution probabilities must sum to 1; got ${totalProbability}`,
    );
  }

  return ok(distribution);
};

export const normalizeDistribution = <TId extends string>(
  outcomes: readonly WeightedOutcome<TId>[],
): KernelResult<DiscreteDistribution<TId>> => {
  if (outcomes.length === 0) {
    return err("precondition-violated", "Distribution requires at least one outcome");
  }

  let maxWeight = 0;
  for (const outcome of outcomes) {
    const weight = finite(outcome.weight, `Outcome ${outcome.id} weight`);
    if (!weight.ok) return weight;
    const value = finite(outcome.value, `Outcome ${outcome.id} value`);
    if (!value.ok) return value;
    if (outcome.weight < 0) {
      return err("out-of-domain", `Outcome ${outcome.id} weight must be non-negative`);
    }
    maxWeight = Math.max(maxWeight, outcome.weight);
  }

  if (maxWeight <= 0) {
    return err("out-of-domain", "Total distribution weight must be positive");
  }

  let totalScaledWeight = 0;
  for (const outcome of outcomes) {
    totalScaledWeight += outcome.weight / maxWeight;
  }
  const validTotalScaledWeight = finiteOutput(totalScaledWeight, "Total distribution weight");
  if (!validTotalScaledWeight.ok) return validTotalScaledWeight;
  if (totalScaledWeight <= 0) {
    return err("out-of-domain", "Total distribution weight must be positive");
  }

  const distribution: DistributionOutcome<TId>[] = [];
  for (const outcome of outcomes) {
    const probabilityResult = probability((outcome.weight / maxWeight) / totalScaledWeight);
    if (!probabilityResult.ok) return probabilityResult;
    distribution.push({
      id: outcome.id,
      probability: probabilityResult.value,
      value: outcome.value,
    });
  }

  return ok(distribution);
};

export const bayesPositiveEvidence = (
  input: BayesPositiveEvidenceInput,
): KernelResult<BayesPositiveEvidence> => {
  const prior = probability(Number(input.prior));
  if (!prior.ok) return prior;
  const sensitivity = probability(Number(input.sensitivity));
  if (!sensitivity.ok) return sensitivity;
  const specificity = probability(Number(input.specificity));
  if (!specificity.ok) return specificity;

  const complementPrior = probability(1 - Number(prior.value));
  if (!complementPrior.ok) return complementPrior;
  const falsePositiveRate = probability(1 - Number(specificity.value));
  if (!falsePositiveRate.ok) return falsePositiveRate;

  const truePositiveWeight = Number(sensitivity.value) * Number(prior.value);
  const falsePositiveWeight = Number(falsePositiveRate.value) * Number(complementPrior.value);
  const routes = normalizeDistribution([
    { id: "true-positive", weight: truePositiveWeight, value: 1 },
    { id: "false-positive", weight: falsePositiveWeight, value: 0 },
  ]);
  if (!routes.ok) return routes;

  const truePositive = routes.value.find((outcome) => outcome.id === "true-positive");
  if (truePositive === undefined) {
    return err("precondition-violated", "Posterior distribution is missing the true-positive route.");
  }

  return ok({
    prior: prior.value,
    complementPrior: complementPrior.value,
    sensitivity: sensitivity.value,
    specificity: specificity.value,
    falsePositiveRate: falsePositiveRate.value,
    truePositiveWeight,
    falsePositiveWeight,
    posterior: truePositive.probability,
    routes: routes.value,
  });
};

const validateNonNegativeCost = (value: number, label: string): KernelResult<number> => {
  const finiteValue = finite(value, label);
  if (!finiteValue.ok) return finiteValue;
  if (value < 0) {
    return err("out-of-domain", `${label} must be non-negative`);
  }
  return ok(value);
};

const ratioProbability = (numerator: number, denominator: number): KernelResult<Probability> =>
  probability(denominator <= 0 ? 0 : numerator / denominator);

const validateThresholdCases = <TId extends string>(
  cases: readonly ThresholdClassifierCase<TId>[],
): KernelResult<readonly ThresholdClassifierCase<TId>[]> => {
  if (cases.length === 0) {
    return err("precondition-violated", "Threshold classification requires at least one case");
  }

  for (const entry of cases) {
    const score = probability(Number(entry.score));
    if (!score.ok) return score;
    if (entry.actual !== "actual-positive" && entry.actual !== "actual-negative") {
      return err(
        "precondition-violated",
        `Case ${entry.id} actual label must be actual-positive or actual-negative`,
      );
    }
  }

  return ok(cases);
};

export const thresholdCaseOutcomes = <TId extends string>(
  cases: readonly ThresholdClassifierCase<TId>[],
  threshold: number,
): KernelResult<readonly ThresholdCaseOutcome<TId>[]> => {
  const validCases = validateThresholdCases(cases);
  if (!validCases.ok) return validCases;
  const validThreshold = probability(Number(threshold));
  if (!validThreshold.ok) return validThreshold;

  const outcomes = validCases.value.map((entry) => {
    const predictedPositive = Number(entry.score) >= Number(validThreshold.value);
    const cell: BinaryConfusionCell =
      predictedPositive && entry.actual === "actual-positive"
        ? "true-positive"
        : predictedPositive
          ? "false-positive"
          : entry.actual === "actual-negative"
            ? "true-negative"
            : "false-negative";
    return { ...entry, predictedPositive, cell };
  });

  return ok(outcomes);
};

export const binaryConfusionCounts = <TId extends string>(
  cases: readonly ThresholdClassifierCase<TId>[],
  threshold: number,
): KernelResult<BinaryConfusionCounts> => {
  const outcomes = thresholdCaseOutcomes(cases, threshold);
  if (!outcomes.ok) return outcomes;

  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;

  for (const entry of outcomes.value) {
    if (entry.cell === "true-positive") truePositive += 1;
    if (entry.cell === "false-positive") falsePositive += 1;
    if (entry.cell === "true-negative") trueNegative += 1;
    if (entry.cell === "false-negative") falseNegative += 1;
  }

  return ok({ truePositive, falsePositive, trueNegative, falseNegative });
};

const thresholdClassificationPoint = <TId extends string>(
  cases: readonly ThresholdClassifierCase<TId>[],
  threshold: Probability,
  falsePositiveCost: number,
  falseNegativeCost: number,
): KernelResult<Omit<ThresholdClassificationEvidence, "curve">> => {
  const counts = binaryConfusionCounts(cases, threshold);
  if (!counts.ok) return counts;

  const precision = ratioProbability(
    counts.value.truePositive,
    counts.value.truePositive + counts.value.falsePositive,
  );
  if (!precision.ok) return precision;
  const recall = ratioProbability(
    counts.value.truePositive,
    counts.value.truePositive + counts.value.falseNegative,
  );
  if (!recall.ok) return recall;
  const accuracy = ratioProbability(
    counts.value.truePositive + counts.value.trueNegative,
    cases.length,
  );
  if (!accuracy.ok) return accuracy;

  const positiveCount = cases.filter((entry) => entry.actual === "actual-positive").length;
  const baseRate = ratioProbability(positiveCount, cases.length);
  if (!baseRate.ok) return baseRate;

  const falsePositiveCostTotal = counts.value.falsePositive * falsePositiveCost;
  const falseNegativeCostTotal = counts.value.falseNegative * falseNegativeCost;
  const totalCost = falsePositiveCostTotal + falseNegativeCostTotal;
  const validFalsePositiveCostTotal = finiteOutput(
    falsePositiveCostTotal,
    "False-positive cost total",
  );
  if (!validFalsePositiveCostTotal.ok) return validFalsePositiveCostTotal;
  const validFalseNegativeCostTotal = finiteOutput(
    falseNegativeCostTotal,
    "False-negative cost total",
  );
  if (!validFalseNegativeCostTotal.ok) return validFalseNegativeCostTotal;
  const validTotalCost = finiteOutput(totalCost, "Total classification cost");
  if (!validTotalCost.ok) return validTotalCost;

  return ok({
    threshold,
    counts: counts.value,
    precision: precision.value,
    recall: recall.value,
    accuracy: accuracy.value,
    baseRate: baseRate.value,
    falsePositiveCost,
    falseNegativeCost,
    falsePositiveCostTotal,
    falseNegativeCostTotal,
    totalCost,
  });
};

export const thresholdClassificationEvidence = <TId extends string>(
  input: ThresholdClassificationInput<TId>,
): KernelResult<ThresholdClassificationEvidence> => {
  const validCases = validateThresholdCases(input.cases);
  if (!validCases.ok) return validCases;
  const threshold = probability(Number(input.threshold));
  if (!threshold.ok) return threshold;
  const falsePositiveCost = validateNonNegativeCost(input.falsePositiveCost, "False-positive cost");
  if (!falsePositiveCost.ok) return falsePositiveCost;
  const falseNegativeCost = validateNonNegativeCost(input.falseNegativeCost, "False-negative cost");
  if (!falseNegativeCost.ok) return falseNegativeCost;

  const base = thresholdClassificationPoint(
    validCases.value,
    threshold.value,
    falsePositiveCost.value,
    falseNegativeCost.value,
  );
  if (!base.ok) return base;

  const curve: ThresholdCurvePoint[] = [];
  for (const candidate of input.curveThresholds ?? []) {
    const validCandidate = probability(Number(candidate));
    if (!validCandidate.ok) return validCandidate;
    const point = thresholdClassificationPoint(
      validCases.value,
      validCandidate.value,
      falsePositiveCost.value,
      falseNegativeCost.value,
    );
    if (!point.ok) return point;
    curve.push({
      thresholdPercent: Number(validCandidate.value) * 100,
      precision: Number(point.value.precision),
      recall: Number(point.value.recall),
      accuracy: Number(point.value.accuracy),
      falsePositiveCostTotal: point.value.falsePositiveCostTotal,
      falseNegativeCostTotal: point.value.falseNegativeCostTotal,
      totalCost: point.value.totalCost,
    });
  }

  return ok({ ...base.value, curve });
};

export const expectedValue = (
  distribution: DiscreteDistribution,
): KernelResult<number> => {
  const valid = validateDistribution(distribution);
  if (!valid.ok) return valid;

  let mean = 0;
  for (const outcome of distribution) {
    mean += outcome.value * Number(outcome.probability);
    const validMean = finiteOutput(mean, "Expected value");
    if (!validMean.ok) return validMean;
  }

  return finiteOutput(mean, "Expected value");
};

export const variance = (
  distribution: DiscreteDistribution,
): KernelResult<number> => {
  const mean = expectedValue(distribution);
  if (!mean.ok) return mean;

  let total = 0;
  for (const outcome of distribution) {
    const delta = outcome.value - mean.value;
    const validDelta = finiteOutput(delta, "Variance delta");
    if (!validDelta.ok) return validDelta;
    total += Number(outcome.probability) * delta * delta;
    const validTotal = finiteOutput(total, "Variance");
    if (!validTotal.ok) return validTotal;
  }

  return finiteOutput(Math.max(0, total), "Variance");
};

const valueAtThreshold = (
  distribution: DiscreteDistribution,
  threshold: number,
): KernelResult<number> => {
  const validThreshold = finite(threshold, "Sampling threshold");
  if (!validThreshold.ok) return validThreshold;
  if (threshold < 0 || threshold > 1) {
    return err("out-of-domain", `Sampling threshold must be in [0, 1]; got ${threshold}`);
  }

  let cumulative = 0;
  for (const outcome of distribution) {
    cumulative += Number(outcome.probability);
    if (threshold <= cumulative) return ok(outcome.value);
  }

  const fallback = distribution.at(-1);
  return fallback === undefined
    ? err("precondition-violated", "Cannot sample from an empty distribution")
    : ok(fallback.value);
};

export const samplingDistributionOfMean = (
  input: SamplingDistributionOfMeanInput,
): KernelResult<SamplingDistributionOfMean> => {
  const validDistribution = validateDistribution(input.distribution);
  if (!validDistribution.ok) return validDistribution;

  if (input.thresholdSamples.length === 0) {
    return err("precondition-violated", "Sampling distribution requires at least one sample");
  }

  const firstSampleSize = input.thresholdSamples[0]?.length;
  if (firstSampleSize === undefined || firstSampleSize <= 0) {
    return err("precondition-violated", "Each sample requires at least one draw");
  }

  const sampleMeans: number[] = [];
  for (const sample of input.thresholdSamples) {
    if (sample.length !== firstSampleSize) {
      return err("precondition-violated", "All samples must use the same sample size");
    }

    let total = 0;
    for (const threshold of sample) {
      const draw = valueAtThreshold(validDistribution.value, threshold);
      if (!draw.ok) return draw;
      total += draw.value;
      const validTotal = finiteOutput(total, "Sample total");
      if (!validTotal.ok) return validTotal;
    }

    const mean = total / sample.length;
    const validMean = finiteOutput(mean, "Sample mean");
    if (!validMean.ok) return validMean;
    sampleMeans.push(mean);
  }

  const populationMean = expectedValue(validDistribution.value);
  if (!populationMean.ok) return populationMean;
  const populationVariance = variance(validDistribution.value);
  if (!populationVariance.ok) return populationVariance;
  const sampleMeanSummary = summarize(sampleMeans, { variance: "population" });
  if (!sampleMeanSummary.ok) return sampleMeanSummary;
  const histogramResult = histogram(sampleMeans, {
    binCount: input.histogramBinCount ?? 8,
  });
  if (!histogramResult.ok) return histogramResult;

  const populationStandardDeviation = Math.sqrt(populationVariance.value);
  const standardError = populationStandardDeviation / Math.sqrt(firstSampleSize);
  if (!Number.isFinite(populationStandardDeviation) || !Number.isFinite(standardError)) {
    return err("numerical-instability", "Sampling distribution spread must be finite");
  }

  return ok({
    populationMean: populationMean.value,
    populationVariance: populationVariance.value,
    populationStandardDeviation,
    standardError,
    sampleMeans,
    sampleMeanSummary: sampleMeanSummary.value,
    histogram: histogramResult.value,
  });
};

export const summarize = (
  values: readonly number[],
  opts: { readonly variance?: VarianceMode } = {},
): KernelResult<SummaryStats> => {
  const valid = validateValues(values, "Summary statistics");
  if (!valid.ok) return valid;

  const mode = opts.variance ?? "sample";
  if (mode === "sample" && values.length < 2) {
    return err("precondition-violated", "Sample variance requires at least two values");
  }

  let mean = 0;
  let sumSquaredDeltas = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) {
      return err("precondition-violated", "Summary statistics received a sparse array");
    }

    const delta = value - mean;
    const validDelta = finiteOutput(delta, "Summary delta");
    if (!validDelta.ok) return validDelta;
    mean += delta / (index + 1);
    const validMean = finiteOutput(mean, "Summary mean");
    if (!validMean.ok) return validMean;
    sumSquaredDeltas += delta * (value - mean);
    const validSumSquaredDeltas = finiteOutput(sumSquaredDeltas, "Summary variance accumulator");
    if (!validSumSquaredDeltas.ok) return validSumSquaredDeltas;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const denominator = mode === "sample" ? values.length - 1 : values.length;
  const computedVariance = sumSquaredDeltas / denominator;
  const validComputedVariance = finiteOutput(computedVariance, "Summary variance");
  if (!validComputedVariance.ok) return validComputedVariance;
  const nonNegativeVariance = Math.max(0, computedVariance);
  const standardDeviation = Math.sqrt(nonNegativeVariance);
  const validStandardDeviation = finiteOutput(standardDeviation, "Summary standard deviation");
  if (!validStandardDeviation.ok) return validStandardDeviation;

  return ok({
    count: values.length,
    mean,
    variance: nonNegativeVariance,
    standardDeviation,
    min,
    max,
  });
};

export const quantile = (
  values: readonly number[],
  p: Probability,
): KernelResult<number> => {
  const valid = validateValues(values, "Quantile");
  if (!valid.ok) return valid;

  const probabilityResult = probability(Number(p));
  if (!probabilityResult.ok) return probabilityResult;

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    const onlyValue = sorted[0];
    return onlyValue === undefined
      ? err("precondition-violated", "Quantile received a sparse array")
      : ok(onlyValue);
  }

  const position = Number(p) * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];

  if (lower === undefined || upper === undefined) {
    return err("precondition-violated", "Quantile interpolation index fell outside values");
  }

  return ok(lower + (upper - lower) * (position - lowerIndex));
};

export const zScore = (
  value: number,
  mean: number,
  standardDeviation: number,
): KernelResult<number> => {
  const validValue = finite(value, "value");
  if (!validValue.ok) return validValue;
  const validMean = finite(mean, "mean");
  if (!validMean.ok) return validMean;
  const validStandardDeviation = finite(standardDeviation, "standardDeviation");
  if (!validStandardDeviation.ok) return validStandardDeviation;

  if (standardDeviation <= 0) {
    return err("out-of-domain", "standardDeviation must be positive");
  }

  const z = (value - mean) / standardDeviation;
  return Number.isFinite(z)
    ? ok(z)
    : err("numerical-instability", "z-score must be finite");
};

const validateHistogramDomain = (
  values: readonly number[],
  domain: Interval | undefined,
): KernelResult<Interval> => {
  if (domain !== undefined) {
    const min = finite(domain.min, "domain.min");
    if (!min.ok) return min;
    const max = finite(domain.max, "domain.max");
    if (!max.ok) return max;
    if (domain.min >= domain.max) {
      return err("precondition-violated", "Histogram domain requires min < max");
    }
    return ok(domain);
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (min === max) {
    const padding = Math.max(0.5, Math.abs(min) * 0.05);
    return ok({ min: min - padding, max: max + padding });
  }

  return ok({ min, max });
};

export const histogram = (
  values: readonly number[],
  opts: { readonly binCount: number; readonly domain?: Interval },
): KernelResult<readonly HistogramBin[]> => {
  const valid = validateValues(values, "Histogram");
  if (!valid.ok) return valid;

  if (!Number.isInteger(opts.binCount) || opts.binCount <= 0) {
    return err("precondition-violated", `binCount must be a positive integer; got ${opts.binCount}`);
  }

  const domain = validateHistogramDomain(values, opts.domain);
  if (!domain.ok) return domain;

  const width = (domain.value.max - domain.value.min) / opts.binCount;
  if (!Number.isFinite(width) || width <= 0) {
    return err("numerical-instability", "Histogram bin width must be finite and positive");
  }
  const counts = Array.from({ length: opts.binCount }, () => 0);

  for (const value of values) {
    if (value < domain.value.min || value > domain.value.max) {
      return err("out-of-domain", `Histogram value ${value} is outside the selected domain`);
    }

    const rawIndex = value === domain.value.max
      ? opts.binCount - 1
      : Math.floor((value - domain.value.min) / width);
    const index = Math.min(opts.binCount - 1, Math.max(0, rawIndex));
    counts[index] = (counts[index] ?? 0) + 1;
  }

  const bins: HistogramBin[] = [];
  for (let index = 0; index < opts.binCount; index += 1) {
    const min = domain.value.min + width * index;
    const max = index === opts.binCount - 1 ? domain.value.max : min + width;
    const count = counts[index] ?? 0;
    const density = count / (values.length * width);
    if (!Number.isFinite(density)) {
      return err("numerical-instability", "Histogram density must be finite");
    }
    bins.push({
      min,
      max,
      count,
      density,
    });
  }

  return ok(bins);
};
