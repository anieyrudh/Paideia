# core/model-evaluation - agent contract

## What this module is

Pure model-evaluation kernels for classification and confidence-calibration
simulations. It owns multi-class confusion matrices, per-label precision/recall
metrics, aggregate F1 summaries, and calibration buckets over already-produced
model scores. It returns symbolic results only; model training, threshold
selection, fairness policy, rendering, and dataset loading live elsewhere.

This module complements `core/probability-stats`: binary threshold accounting and
cost curves stay there. Use this module when a sim needs multi-class model
quality or calibration evidence after predictions already exist.

## Public interface

Exports from `@paideia/model-evaluation`:

- `LabelName = Brand<string, "ModelEvaluation.LabelName">`
- `ProbabilityScore = Brand<number, "ModelEvaluation.ProbabilityScore">`
- `ClassifiedExample = { id: string; actual: LabelName; predicted: LabelName }`
- `ConfusionCell = { actual: LabelName; predicted: LabelName; count: number }`
- `ClassCounts = { truePositive: number; falsePositive: number; falseNegative: number; trueNegative: number }`
- `PerLabelMetrics = { label: LabelName; counts: ClassCounts; precision: number; recall: number; f1: number; support: number }`
- `AggregateMetrics = { accuracy: number; macroF1: number; microF1: number; weightedF1: number }`
- `ConfusionMatrix = { labels: readonly LabelName[]; cells: readonly ConfusionCell[]; perLabel: readonly PerLabelMetrics[]; aggregate: AggregateMetrics }`
- `ScoredBinaryExample = { id: string; score: ProbabilityScore; actualPositive: boolean }`
- `CalibrationBucket = { minScore: number; maxScore: number; count: number; meanScore: number; observedPositiveRate: number }`
- `CalibrationReport = { buckets: readonly CalibrationBucket[]; brierScore: number; expectedCalibrationError: number }`
- `ModelMetric = "accuracy" | "macroF1" | "microF1" | "weightedF1"`
- `ModelComparison = "left" | "right" | "tie"`
- `labelName(value: string): KernelResult<LabelName>`
- `probabilityScore(value: number): KernelResult<ProbabilityScore>`
- `confusionMatrix(examples: readonly ClassifiedExample[], labels?: readonly LabelName[]): KernelResult<ConfusionMatrix>`
- `perLabelMetrics(matrix: ConfusionMatrix, label: LabelName): KernelResult<PerLabelMetrics>`
- `calibrationReport(examples: readonly ScoredBinaryExample[], bucketCount: number): KernelResult<CalibrationReport>`
- `compareAggregateMetrics(left: AggregateMetrics, right: AggregateMetrics, metric: ModelMetric): KernelResult<ModelComparison>`

## Invariants the caller must preserve

- Label names must be non-empty trimmed strings.
- Probability scores must be finite and in `[0, 1]`.
- Multi-class confusion matrices require at least one example.
- Explicit label lists must be non-empty, duplicate-free, and must cover every
  actual and predicted label in the examples.
- Counts and aggregate metrics are finite and never `NaN`.
- Precision, recall, and F1 use `0` when their denominator is zero.
- Calibration reports require at least one scored example.
- Calibration bucket counts are positive integers from `1` through `50`.
- Input arrays and caller-owned records are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not train, fit, tune, or infer with machine-learning models.
- Does not choose or sweep binary decision thresholds; use
  `core/probability-stats` for thresholded binary confusion evidence.
- Does not define fairness policy, group weights, harm weights, or stakeholder
  costs.
- Does not render charts, matrices, or reliability diagrams.
- Does not fetch datasets, parse files, or perform branch-specific mapping.

## When to consider this module

Use `core/model-evaluation` when a container needs canonical multi-class
confusion-matrix metrics, macro/micro/weighted F1 summaries, or calibration
evidence for confidence scores. If a sim is about to inline precision/recall/F1
or reliability-bucket math, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to metric semantics, calibration semantics, or
   public report shape.

## Anti-patterns (will be rejected in PR review)

- Duplicating `core/probability-stats` threshold-cost evidence.
- Returning percentages in some functions and unit intervals in others.
- Mutating caller-owned examples, label arrays, or matrix objects.
- Hidden global caches, stochastic metric estimates, or external data fetches.
- Branch-specific defaults (`if DAI then ...`, `if a-level then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that simulations do not hide denominator choices: precision,
recall, F1, accuracy, and calibration readouts must show the counts or bucket
evidence that produced them. Confidence claims must be phrased as calibration
evidence, not as proof that the model is correct.
