import { err, ok, type KernelResult } from "@paideia/shared";

export const mlClassificationTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type BinaryLabel = 0 | 1;

export interface LinearScoreInput {
  readonly weights: readonly number[];
  readonly features: readonly number[];
  readonly bias?: number;
}

export interface LogisticLossInput {
  readonly score: number;
  readonly label: BinaryLabel;
}

export interface ScoredBinaryExample {
  readonly score: number;
  readonly label: BinaryLabel;
}

export interface BinaryConfusionCounts {
  readonly truePositive: number;
  readonly trueNegative: number;
  readonly falsePositive: number;
  readonly falseNegative: number;
  readonly total: number;
}

export interface ConfusionCountsFromScoresInput {
  readonly examples: readonly ScoredBinaryExample[];
  readonly threshold: number;
}

export interface PerceptronStepInput {
  readonly weights: readonly number[];
  readonly features: readonly number[];
  readonly bias: number;
  readonly label: BinaryLabel;
  readonly learningRate: number;
}

export interface PerceptronStep {
  readonly weights: readonly number[];
  readonly bias: number;
  readonly activated: boolean;
  readonly signedActivation: number;
}

export interface LinearSeparatorMarginInput {
  readonly weights: readonly number[];
  readonly features: readonly number[];
  readonly bias?: number;
  readonly label?: BinaryLabel;
}

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const validateBinaryLabel = (label: BinaryLabel, field: string): KernelResult<void> =>
  label === 0 || label === 1
    ? ok(undefined)
    : err("out-of-domain", `${field} must be 0 or 1; got ${String(label)}`);

const validateVectorPair = (
  weights: readonly number[],
  features: readonly number[],
): KernelResult<void> => {
  if (weights.length === 0) {
    return err("precondition-violated", "weights must not be empty");
  }
  if (features.length === 0) {
    return err("precondition-violated", "features must not be empty");
  }
  if (weights.length !== features.length) {
    return err(
      "precondition-violated",
      `weights and features must have the same length; got ${weights.length} and ${features.length}`,
    );
  }
  for (const [index, weight] of weights.entries()) {
    const valid = finite(weight, `weights[${index}]`);
    if (!valid.ok) return valid;
  }
  for (const [index, feature] of features.entries()) {
    const valid = finite(feature, `features[${index}]`);
    if (!valid.ok) return valid;
  }
  return ok(undefined);
};

const labelSign = (label: BinaryLabel): -1 | 1 => (label === 1 ? 1 : -1);

const scoreUnchecked = (
  weights: readonly number[],
  features: readonly number[],
  bias: number,
): number => weights.reduce((sum, weight, index) => sum + weight * features[index]!, bias);

const vectorNorm = (weights: readonly number[]): number =>
  Math.sqrt(weights.reduce((sum, weight) => sum + weight * weight, 0));

export const linearScore = (input: LinearScoreInput): KernelResult<number> => {
  const vectors = validateVectorPair(input.weights, input.features);
  if (!vectors.ok) return vectors;
  const bias = input.bias ?? 0;
  const validBias = finite(bias, "bias");
  if (!validBias.ok) return validBias;
  const score = scoreUnchecked(input.weights, input.features, bias);
  const computed = finiteDerived(score, "linearScore");
  if (!computed.ok) return computed;
  return ok(score);
};

export const sigmoidProbability = (score: number): KernelResult<number> => {
  const validScore = finite(score, "score");
  if (!validScore.ok) return validScore;
  const probability =
    score >= 0
      ? 1 / (1 + Math.exp(-score))
      : Math.exp(score) / (1 + Math.exp(score));
  const computed = finiteDerived(probability, "sigmoidProbability");
  if (!computed.ok) return computed;
  if (probability < 0 || probability > 1) {
    return err("numerical-instability", `sigmoidProbability must be in [0, 1]; got ${probability}`);
  }
  return ok(probability);
};

export const binaryLogisticLoss = (input: LogisticLossInput): KernelResult<number> => {
  const label = validateBinaryLabel(input.label, "label");
  if (!label.ok) return label;
  const score = finite(input.score, "score");
  if (!score.ok) return score;
  const positivePart = Math.max(input.score, 0);
  const loss = positivePart - input.label * input.score + Math.log1p(Math.exp(-Math.abs(input.score)));
  const computed = finiteDerived(loss, "binaryLogisticLoss");
  if (!computed.ok) return computed;
  return ok(loss);
};

export const confusionCountsFromScores = (
  input: ConfusionCountsFromScoresInput,
): KernelResult<BinaryConfusionCounts> => {
  if (input.examples.length === 0) {
    return err("precondition-violated", "examples must not be empty");
  }
  const threshold = finite(input.threshold, "threshold");
  if (!threshold.ok) return threshold;
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const [index, example] of input.examples.entries()) {
    const score = finite(example.score, `examples[${index}].score`);
    if (!score.ok) return score;
    const label = validateBinaryLabel(example.label, `examples[${index}].label`);
    if (!label.ok) return label;
    const predictedPositive = example.score >= input.threshold;
    if (predictedPositive && example.label === 1) truePositive += 1;
    if (!predictedPositive && example.label === 0) trueNegative += 1;
    if (predictedPositive && example.label === 0) falsePositive += 1;
    if (!predictedPositive && example.label === 1) falseNegative += 1;
  }
  return ok(Object.freeze({
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    total: input.examples.length,
  }));
};

export const perceptronStep = (input: PerceptronStepInput): KernelResult<PerceptronStep> => {
  const vectors = validateVectorPair(input.weights, input.features);
  if (!vectors.ok) return vectors;
  const bias = finite(input.bias, "bias");
  if (!bias.ok) return bias;
  const label = validateBinaryLabel(input.label, "label");
  if (!label.ok) return label;
  const learningRate = finite(input.learningRate, "learningRate");
  if (!learningRate.ok) return learningRate;
  if (input.learningRate <= 0) {
    return err("out-of-domain", `learningRate must be positive; got ${input.learningRate}`);
  }
  const signedLabel = labelSign(input.label);
  const activation = scoreUnchecked(input.weights, input.features, input.bias);
  const computed = finiteDerived(activation, "perceptron activation");
  if (!computed.ok) return computed;
  const signedActivation = signedLabel * activation;
  const activated = signedActivation <= 0;
  const weights = activated
    ? input.weights.map((weight, index) => weight + input.learningRate * signedLabel * input.features[index]!)
    : [...input.weights];
  const nextBias = activated ? input.bias + input.learningRate * signedLabel : input.bias;
  const validNextBias = finiteDerived(nextBias, "perceptron bias");
  if (!validNextBias.ok) return validNextBias;
  for (const [index, weight] of weights.entries()) {
    const validWeight = finiteDerived(weight, `perceptron weights[${index}]`);
    if (!validWeight.ok) return validWeight;
  }
  return ok(Object.freeze({
    weights: Object.freeze(weights),
    bias: nextBias,
    activated,
    signedActivation,
  }));
};

export const linearSeparatorMargin = (
  input: LinearSeparatorMarginInput,
): KernelResult<number> => {
  const vectors = validateVectorPair(input.weights, input.features);
  if (!vectors.ok) return vectors;
  const bias = input.bias ?? 0;
  const validBias = finite(bias, "bias");
  if (!validBias.ok) return validBias;
  if (input.label !== undefined) {
    const label = validateBinaryLabel(input.label, "label");
    if (!label.ok) return label;
  }
  const norm = vectorNorm(input.weights);
  const validNorm = finiteDerived(norm, "weight norm");
  if (!validNorm.ok) return validNorm;
  if (norm <= mlClassificationTolerance.tight) {
    return err("out-of-domain", "weights must have non-zero norm");
  }
  const signedDistance = scoreUnchecked(input.weights, input.features, bias) / norm;
  const margin = input.label === undefined ? signedDistance : labelSign(input.label) * signedDistance;
  const computed = finiteDerived(margin, "linearSeparatorMargin");
  if (!computed.ok) return computed;
  return ok(margin);
};
