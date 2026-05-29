# core/ml-classification - agent contract

## What this module is

The deterministic introductory binary-classification kernel for Paideia
simulations. It owns small, inspectable helpers for linear scores, sigmoid
probabilities, logistic loss, thresholded binary confusion counts, one
perceptron update step, and geometric margin against a linear separator. It is
pure TypeScript and returns `KernelResult` values for expected invalid inputs.

## Public interface

Exports from `@paideia/ml-classification`:

- `mlClassificationTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type BinaryLabel = 0 | 1`
- `type LinearScoreInput`
- `type LogisticLossInput`
- `type ScoredBinaryExample`
- `type BinaryConfusionCounts`
- `type ConfusionCountsFromScoresInput`
- `type PerceptronStepInput`
- `type PerceptronStep`
- `type LinearSeparatorMarginInput`
- `linearScore(input: LinearScoreInput): KernelResult<number>`
- `sigmoidProbability(score: number): KernelResult<number>`
- `binaryLogisticLoss(input: LogisticLossInput): KernelResult<number>`
- `confusionCountsFromScores(input: ConfusionCountsFromScoresInput): KernelResult<BinaryConfusionCounts>`
- `perceptronStep(input: PerceptronStepInput): KernelResult<PerceptronStep>`
- `linearSeparatorMargin(input: LinearSeparatorMarginInput): KernelResult<number>`

## Invariants the caller must preserve

- Feature vectors and weight vectors are finite and have the same non-zero
  length.
- Biases, scores, thresholds, and learning rates are finite numbers.
- Binary labels are exactly `0` or `1`.
- Perceptron learning rates are strictly positive.
- Linear-separator margin requires a non-zero weight-vector norm.
- The kernel is deterministic and never mutates caller-owned arrays or records.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does **not** train models across datasets or provide a training framework.
- Does **not** initialise random weights, split datasets, tune thresholds, or
  choose model hyperparameters.
- Does **not** implement neural networks, SVM optimizers, probabilistic
  calibration, fairness policy, rendering, or dataset loading.
- Does **not** contain branch-specific feature transforms, presets, or flags.

## When to consider this module

Use `core/ml-classification` when a container needs transparent binary
classification arithmetic for introductory ML concepts. If a sim is about to
inline dot-product scores, sigmoid probabilities, logistic-loss values,
thresholded binary confusion counts, one perceptron update, or separator-margin
math, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Add property tests for every new classification invariant.
3. Use `core!:` for changes to label semantics, threshold semantics,
   perceptron activation semantics, or loss semantics.

## Anti-patterns

- Adding hidden randomness, epochs, optimizers, or framework adapters.
- Adding TensorFlow, ONNX, scikit-learn, or other ML runtime dependencies.
- Mutating caller-provided feature, weight, or example arrays.
- Returning percentages in one function and unit-interval probabilities in
  another.
- Adding curriculum-branch conditionals.

## Dependency and license notes

Runtime dependencies are limited to `@paideia/shared`. Test-only dependencies
may use existing workspace tooling such as Vitest and fast-check.

## Minimal examples

```ts
import {
  binaryLogisticLoss,
  confusionCountsFromScores,
  linearScore,
  sigmoidProbability,
} from "@paideia/ml-classification";

const score = linearScore({ weights: [2, -1], features: [3, 4], bias: 0.5 });
if (score.ok) {
  const probability = sigmoidProbability(score.value);
  const loss = binaryLogisticLoss({ score: score.value, label: 1 });
}

const counts = confusionCountsFromScores({
  examples: [
    { score: 0.7, label: 1 },
    { score: -0.2, label: 0 },
  ],
  threshold: 0,
});
```

## How the Anieyrudh Filter reads this module

The Filter checks that binary-classification simulations expose the score,
threshold, label, and count evidence that produced their claims. It rejects
visuals that imply a hidden training framework, stochastic optimisation, or
unstated threshold choice when this kernel is the source of the displayed
classification arithmetic.
