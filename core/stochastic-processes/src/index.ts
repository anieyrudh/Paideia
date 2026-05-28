import { err, ok, type KernelResult } from "@paideia/shared";

export const stochasticTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface MarkovChainInput {
  readonly transitionMatrix: readonly (readonly number[])[];
}

export interface DistributionStepInput {
  readonly distribution: readonly number[];
  readonly transitionMatrix: readonly (readonly number[])[];
}

export interface NStepDistributionInput extends DistributionStepInput {
  readonly steps: number;
}

export interface DistributionResult {
  readonly distribution: readonly number[];
}

const finiteProbability = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value >= 0 && value <= 1
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a finite probability in [0, 1]; got ${value}`);

const positiveInteger = (value: number, label: string): KernelResult<void> =>
  Number.isInteger(value) && value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a non-negative integer; got ${value}`);

const sumsToOne = (values: readonly number[], label: string): KernelResult<void> => {
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return Math.abs(sum - 1) <= stochasticTolerance.loose
    ? ok(undefined)
    : err("out-of-domain", `${label} must sum to 1; got ${sum}`);
};

export const validateTransitionMatrix = (input: MarkovChainInput): KernelResult<void> => {
  if (input.transitionMatrix.length === 0) {
    return err("precondition-violated", "transitionMatrix must not be empty");
  }
  const size = input.transitionMatrix.length;
  for (const [rowIndex, row] of input.transitionMatrix.entries()) {
    if (row.length !== size) {
      return err("precondition-violated", `transitionMatrix[${rowIndex}] must have length ${size}`);
    }
    for (const [columnIndex, value] of row.entries()) {
      const valid = finiteProbability(value, `transitionMatrix[${rowIndex}][${columnIndex}]`);
      if (!valid.ok) return valid;
    }
    const rowSum = sumsToOne(row, `transitionMatrix[${rowIndex}]`);
    if (!rowSum.ok) return rowSum;
  }
  return ok(undefined);
};

export const nextDistribution = (
  input: DistributionStepInput,
): KernelResult<DistributionResult> => {
  const matrix = validateTransitionMatrix({ transitionMatrix: input.transitionMatrix });
  if (!matrix.ok) return matrix;
  if (input.distribution.length !== input.transitionMatrix.length) {
    return err("precondition-violated", "distribution length must match transitionMatrix size");
  }
  for (const [index, value] of input.distribution.entries()) {
    const valid = finiteProbability(value, `distribution[${index}]`);
    if (!valid.ok) return valid;
  }
  const distributionSum = sumsToOne(input.distribution, "distribution");
  if (!distributionSum.ok) return distributionSum;

  const output = input.transitionMatrix.map((_, targetIndex) =>
    input.distribution.reduce(
      (sum, sourceProbability, sourceIndex) =>
        sum + sourceProbability * (input.transitionMatrix[sourceIndex]?.[targetIndex] ?? 0),
      0,
    ),
  );
  const normalized = output.map((value) =>
    Math.abs(value) < stochasticTolerance.tight ? 0 : value,
  );
  const outputSum = sumsToOne(normalized, "nextDistribution");
  if (!outputSum.ok) return outputSum;
  return ok(Object.freeze({ distribution: Object.freeze([...normalized]) }));
};

export const nStepDistribution = (
  input: NStepDistributionInput,
): KernelResult<DistributionResult> => {
  const steps = positiveInteger(input.steps, "steps");
  if (!steps.ok) return steps;
  let current = [...input.distribution];
  for (let step = 0; step < input.steps; step += 1) {
    const next = nextDistribution({
      distribution: current,
      transitionMatrix: input.transitionMatrix,
    });
    if (!next.ok) return next;
    current = [...next.value.distribution];
  }
  return ok(Object.freeze({ distribution: Object.freeze(current) }));
};
