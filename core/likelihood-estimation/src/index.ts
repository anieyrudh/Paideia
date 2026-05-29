import { err, ok, type KernelResult } from "@paideia/shared";

export const likelihoodEstimationTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface LikelihoodCurvePoint {
  readonly parameter: number;
  readonly logLikelihood: number;
  readonly relativeLikelihood: number;
}

export interface MleEstimate<TParameterName extends string = string> {
  readonly parameterName: TParameterName;
  readonly estimate: number;
  readonly logLikelihood: number;
  readonly curve: readonly LikelihoodCurvePoint[];
}

export interface BernoulliLogLikelihoodInput {
  readonly successes: number;
  readonly trials: number;
  readonly probability: number;
}

export interface BernoulliMleInput {
  readonly successes: number;
  readonly trials: number;
  readonly candidateProbabilities?: readonly number[];
}

export interface PoissonLogLikelihoodInput {
  readonly observations: readonly number[];
  readonly rate: number;
}

export interface PoissonMleInput {
  readonly observations: readonly number[];
  readonly candidateRates?: readonly number[];
}

export interface NormalMeanKnownSigmaLogLikelihoodInput {
  readonly observations: readonly number[];
  readonly mean: number;
  readonly populationStandardDeviation: number;
}

export interface NormalMeanKnownSigmaMleInput {
  readonly observations: readonly number[];
  readonly populationStandardDeviation: number;
  readonly candidateMeans?: readonly number[];
}

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const positive = (value: number, label: string): KernelResult<void> => {
  const checked = finite(value, label);
  if (!checked.ok) return checked;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const nonNegativeInteger = (value: number, label: string): KernelResult<void> => {
  const checked = finite(value, label);
  if (!checked.ok) return checked;
  return Number.isInteger(value) && value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a non-negative integer; got ${value}`);
};

const probability = (value: number, label: string): KernelResult<void> => {
  const checked = finite(value, label);
  if (!checked.ok) return checked;
  return value >= 0 && value <= 1
    ? ok(undefined)
    : err("out-of-domain", `${label} must be in [0, 1]; got ${value}`);
};

const observations = (values: readonly number[], label: string): KernelResult<void> => {
  if (values.length === 0) {
    return err("precondition-violated", `${label} must contain at least one observation`);
  }
  for (const [index, value] of values.entries()) {
    const checked = finite(value, `${label}[${index}]`);
    if (!checked.ok) return checked;
  }
  return ok(undefined);
};

const poissonObservations = (values: readonly number[], label: string): KernelResult<void> => {
  const checked = observations(values, label);
  if (!checked.ok) return checked;
  for (const [index, value] of values.entries()) {
    const count = nonNegativeInteger(value, `${label}[${index}]`);
    if (!count.ok) return count;
  }
  return ok(undefined);
};

const validateCandidates = (
  values: readonly number[] | undefined,
  label: string,
  validate: (value: number, valueLabel: string) => KernelResult<void>,
): KernelResult<readonly number[]> => {
  if (values === undefined) return ok(Object.freeze([]));
  if (values.length === 0) {
    return err("precondition-violated", `${label} must not be empty when provided`);
  }
  const seen = new Set<number>();
  const out: number[] = [];
  for (const [index, value] of values.entries()) {
    const checked = validate(value, `${label}[${index}]`);
    if (!checked.ok) return checked;
    if (seen.has(value)) {
      return err("precondition-violated", `${label}[${index}] duplicates ${value}`);
    }
    seen.add(value);
    out.push(value);
  }
  return ok(Object.freeze(out));
};

const logPower = (count: number, probabilityValue: number): number => {
  if (count === 0) return 0;
  if (probabilityValue === 0) return Number.NEGATIVE_INFINITY;
  return count * Math.log(probabilityValue);
};

const finiteLogLikelihood = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value) || value === Number.NEGATIVE_INFINITY
    ? ok(value)
    : err("numerical-instability", `${label} must be finite or -Infinity; got ${value}`);

const factorialLog = (count: number): number => {
  let total = 0;
  for (let n = 2; n <= count; n += 1) total += Math.log(n);
  return total;
};

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const curveFromCandidates = <TParameterName extends string>(
  parameterName: TParameterName,
  estimate: number,
  candidateParameters: readonly number[],
  evaluate: (parameter: number) => KernelResult<number>,
): KernelResult<MleEstimate<TParameterName>> => {
  const allParameters = [...candidateParameters, estimate].sort((a, b) => a - b);
  const uniqueParameters = allParameters.filter((value, index) => index === 0 || value !== allParameters[index - 1]);
  const raw: Array<{ readonly parameter: number; readonly logLikelihood: number }> = [];
  for (const parameterValue of uniqueParameters) {
    const evaluated = evaluate(parameterValue);
    if (!evaluated.ok) return evaluated;
    raw.push(Object.freeze({ parameter: parameterValue, logLikelihood: evaluated.value }));
  }
  const estimateLogLikelihood = evaluate(estimate);
  if (!estimateLogLikelihood.ok) return estimateLogLikelihood;
  const finiteCurveMaximum = Math.max(...raw.map((point) => point.logLikelihood));
  const curveMaximum = Number.isFinite(finiteCurveMaximum) ? finiteCurveMaximum : estimateLogLikelihood.value;
  const curve = raw.map((point): LikelihoodCurvePoint => Object.freeze({
    parameter: point.parameter,
    logLikelihood: point.logLikelihood,
    relativeLikelihood: point.logLikelihood === Number.NEGATIVE_INFINITY
      ? 0
      : Math.exp(point.logLikelihood - curveMaximum),
  }));
  return ok(Object.freeze({
    parameterName,
    estimate,
    logLikelihood: estimateLogLikelihood.value,
    curve: Object.freeze(curve),
  }));
};

export const bernoulliLogLikelihood = (
  input: BernoulliLogLikelihoodInput,
): KernelResult<number> => {
  const successes = nonNegativeInteger(input.successes, "successes");
  if (!successes.ok) return successes;
  const trials = nonNegativeInteger(input.trials, "trials");
  if (!trials.ok) return trials;
  if (input.successes > input.trials) {
    return err("out-of-domain", "successes must be <= trials");
  }
  const p = probability(input.probability, "probability");
  if (!p.ok) return p;
  const failures = input.trials - input.successes;
  const logLikelihood = logPower(input.successes, input.probability) + logPower(failures, 1 - input.probability);
  return finiteLogLikelihood(logLikelihood, "logLikelihood");
};

export const bernoulliMaximumLikelihood = (
  input: BernoulliMleInput,
): KernelResult<MleEstimate<"probability">> => {
  const successes = nonNegativeInteger(input.successes, "successes");
  if (!successes.ok) return successes;
  const trials = nonNegativeInteger(input.trials, "trials");
  if (!trials.ok) return trials;
  if (input.trials === 0) {
    return err("precondition-violated", "trials must be positive for a Bernoulli MLE");
  }
  if (input.successes > input.trials) {
    return err("out-of-domain", "successes must be <= trials");
  }
  const candidates = validateCandidates(input.candidateProbabilities, "candidateProbabilities", probability);
  if (!candidates.ok) return candidates;
  const estimate = input.successes / input.trials;
  return curveFromCandidates("probability", estimate, candidates.value, (candidate) =>
    bernoulliLogLikelihood({ successes: input.successes, trials: input.trials, probability: candidate }));
};

export const poissonLogLikelihood = (
  input: PoissonLogLikelihoodInput,
): KernelResult<number> => {
  const checked = poissonObservations(input.observations, "observations");
  if (!checked.ok) return checked;
  const rate = positive(input.rate, "rate");
  if (!rate.ok) return rate;
  let logLikelihood = 0;
  for (const observed of input.observations) {
    logLikelihood += observed * Math.log(input.rate) - input.rate - factorialLog(observed);
  }
  const valid = finiteDerived(logLikelihood, "logLikelihood");
  return valid.ok ? ok(logLikelihood) : valid;
};

export const poissonMaximumLikelihood = (
  input: PoissonMleInput,
): KernelResult<MleEstimate<"rate">> => {
  const checked = poissonObservations(input.observations, "observations");
  if (!checked.ok) return checked;
  const candidates = validateCandidates(input.candidateRates, "candidateRates", positive);
  if (!candidates.ok) return candidates;
  const estimate = mean(input.observations);
  if (estimate <= 0) {
    return err("out-of-domain", "Poisson MLE rate is zero; at least one count must be positive");
  }
  return curveFromCandidates("rate", estimate, candidates.value, (candidate) =>
    poissonLogLikelihood({ observations: input.observations, rate: candidate }));
};

export const normalMeanKnownSigmaLogLikelihood = (
  input: NormalMeanKnownSigmaLogLikelihoodInput,
): KernelResult<number> => {
  const checked = observations(input.observations, "observations");
  if (!checked.ok) return checked;
  const candidateMean = finite(input.mean, "mean");
  if (!candidateMean.ok) return candidateMean;
  const sigma = positive(input.populationStandardDeviation, "populationStandardDeviation");
  if (!sigma.ok) return sigma;
  const variance = input.populationStandardDeviation ** 2;
  const constant = -Math.log(input.populationStandardDeviation * Math.sqrt(2 * Math.PI));
  let logLikelihood = 0;
  for (const observed of input.observations) {
    const residual = observed - input.mean;
    logLikelihood += constant - (residual ** 2) / (2 * variance);
  }
  const valid = finiteDerived(logLikelihood, "logLikelihood");
  return valid.ok ? ok(logLikelihood) : valid;
};

export const normalMeanKnownSigmaMaximumLikelihood = (
  input: NormalMeanKnownSigmaMleInput,
): KernelResult<MleEstimate<"mean">> => {
  const checked = observations(input.observations, "observations");
  if (!checked.ok) return checked;
  const sigma = positive(input.populationStandardDeviation, "populationStandardDeviation");
  if (!sigma.ok) return sigma;
  const candidates = validateCandidates(input.candidateMeans, "candidateMeans", finite);
  if (!candidates.ok) return candidates;
  const estimate = mean(input.observations);
  const estimateValid = finiteDerived(estimate, "estimate");
  if (!estimateValid.ok) return estimateValid;
  return curveFromCandidates("mean", estimate, candidates.value, (candidate) =>
    normalMeanKnownSigmaLogLikelihood({
      observations: input.observations,
      mean: candidate,
      populationStandardDeviation: input.populationStandardDeviation,
    }));
};
