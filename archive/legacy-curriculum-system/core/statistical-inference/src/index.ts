import { err, ok, type KernelResult } from "@paideia/shared";

export const statisticalInferenceTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type ConfidenceLevel = 0.9 | 0.95 | 0.99;

export interface MeanConfidenceIntervalInput {
  readonly sampleMean: number;
  readonly populationStandardDeviation: number;
  readonly sampleSize: number;
  readonly confidenceLevel: ConfidenceLevel;
}

export interface ConfidenceInterval {
  readonly estimate: number;
  readonly standardError: number;
  readonly criticalValue: number;
  readonly marginOfError: number;
  readonly lower: number;
  readonly upper: number;
  readonly confidenceLevel: ConfidenceLevel;
}

export interface ProportionConfidenceIntervalInput {
  readonly successes: number;
  readonly trials: number;
  readonly confidenceLevel: ConfidenceLevel;
}

export interface StandardizedEffectInput {
  readonly estimate: number;
  readonly nullValue: number;
  readonly standardError: number;
}

export interface StandardizedEffectResult {
  readonly statistic: number;
  readonly direction: "above-null" | "below-null" | "at-null";
}

const zCritical: Record<ConfidenceLevel, number> = {
  0.9: 1.6448536269514722,
  0.95: 1.959963984540054,
  0.99: 2.5758293035489004,
};

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const nonNegativeInteger = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return Number.isInteger(value) && value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a non-negative integer; got ${value}`);
};

const positiveInteger = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return Number.isInteger(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a positive integer; got ${value}`);
};

const supportedConfidence = (value: number): value is ConfidenceLevel =>
  value === 0.9 || value === 0.95 || value === 0.99;

const confidenceCritical = (confidenceLevel: ConfidenceLevel): KernelResult<number> =>
  supportedConfidence(confidenceLevel)
    ? ok(zCritical[confidenceLevel])
    : err("out-of-domain", `confidenceLevel must be 0.9, 0.95, or 0.99; got ${confidenceLevel}`);

export const meanConfidenceIntervalKnownSigma = (
  input: MeanConfidenceIntervalInput,
): KernelResult<ConfidenceInterval> => {
  const mean = finite(input.sampleMean, "sampleMean");
  if (!mean.ok) return mean;
  const sigma = positive(input.populationStandardDeviation, "populationStandardDeviation");
  if (!sigma.ok) return sigma;
  const sampleSize = positiveInteger(input.sampleSize, "sampleSize");
  if (!sampleSize.ok) return sampleSize;
  const critical = confidenceCritical(input.confidenceLevel);
  if (!critical.ok) return critical;

  const standardError = input.populationStandardDeviation / Math.sqrt(input.sampleSize);
  const marginOfError = critical.value * standardError;
  const lower = input.sampleMean - marginOfError;
  const upper = input.sampleMean + marginOfError;
  for (const [value, label] of [
    [standardError, "standardError"],
    [marginOfError, "marginOfError"],
    [lower, "lower"],
    [upper, "upper"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    estimate: input.sampleMean,
    standardError,
    criticalValue: critical.value,
    marginOfError,
    lower,
    upper,
    confidenceLevel: input.confidenceLevel,
  }));
};

export const proportionWaldConfidenceInterval = (
  input: ProportionConfidenceIntervalInput,
): KernelResult<ConfidenceInterval> => {
  const successes = nonNegativeInteger(input.successes, "successes");
  if (!successes.ok) return successes;
  const trials = positiveInteger(input.trials, "trials");
  if (!trials.ok) return trials;
  if (input.successes > input.trials) {
    return err("out-of-domain", "successes must be <= trials");
  }
  const critical = confidenceCritical(input.confidenceLevel);
  if (!critical.ok) return critical;

  const estimate = input.successes / input.trials;
  const standardError = Math.sqrt((estimate * (1 - estimate)) / input.trials);
  const marginOfError = critical.value * standardError;
  const lower = Math.max(0, estimate - marginOfError);
  const upper = Math.min(1, estimate + marginOfError);
  return ok(Object.freeze({
    estimate,
    standardError,
    criticalValue: critical.value,
    marginOfError,
    lower,
    upper,
    confidenceLevel: input.confidenceLevel,
  }));
};

export const standardizedEffect = (
  input: StandardizedEffectInput,
): KernelResult<StandardizedEffectResult> => {
  const estimate = finite(input.estimate, "estimate");
  if (!estimate.ok) return estimate;
  const nullValue = finite(input.nullValue, "nullValue");
  if (!nullValue.ok) return nullValue;
  const standardError = positive(input.standardError, "standardError");
  if (!standardError.ok) return standardError;

  const statistic = (input.estimate - input.nullValue) / input.standardError;
  const computed = finiteDerived(statistic, "statistic");
  if (!computed.ok) return computed;
  const direction =
    statistic > statisticalInferenceTolerance.default
      ? "above-null"
      : statistic < -statisticalInferenceTolerance.default
        ? "below-null"
        : "at-null";
  return ok(Object.freeze({ statistic, direction }));
};
