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
