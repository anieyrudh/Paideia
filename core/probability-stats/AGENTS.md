# core/probability-stats · agent contract

## What this module is
The probability and descriptive statistics kernel for shared curriculum simulations. It owns finite discrete distributions, expected value, variance, summary statistics, quantiles, z-scores, and histogram binning. It returns numbers and readonly data structures only: no rendering, no learner state, no sampling randomness.

## Public interface
Exports from `@paideia/probability-stats`:

- `WeightedOutcome<TId extends string = string> = { id: TId; weight: number; value: number }`
- `DistributionOutcome<TId extends string = string> = { id: TId; probability: Probability; value: number }`
- `DiscreteDistribution<TId extends string = string> = readonly DistributionOutcome<TId>[]`
- `VarianceMode = "population" | "sample"`
- `SummaryStats = { count: number; mean: number; variance: number; standardDeviation: number; min: number; max: number }`
- `HistogramBin = { min: number; max: number; count: number; density: number }`
- `SamplingDistributionOfMeanInput = { distribution: DiscreteDistribution; thresholdSamples: readonly (readonly number[])[]; histogramBinCount?: number }`
- `SamplingDistributionOfMean = { populationMean: number; populationVariance: number; populationStandardDeviation: number; standardError: number; sampleMeans: readonly number[]; sampleMeanSummary: SummaryStats; histogram: readonly HistogramBin[] }`
- `BayesPositiveEvidenceInput = { prior: Probability; sensitivity: Probability; specificity: Probability }`
- `BayesPositiveEvidence = { prior: Probability; complementPrior: Probability; sensitivity: Probability; specificity: Probability; falsePositiveRate: Probability; truePositiveWeight: number; falsePositiveWeight: number; posterior: Probability; routes: DiscreteDistribution<"true-positive" | "false-positive"> }`
- `BinaryClassLabel = "actual-positive" | "actual-negative"`
- `ThresholdClassifierCase<TId extends string = string> = { id: TId; score: number; actual: BinaryClassLabel }`
- `BinaryConfusionCounts = { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number }`
- `BinaryConfusionCell = "true-positive" | "false-positive" | "true-negative" | "false-negative"`
- `ThresholdCaseOutcome<TId extends string = string> = { id: TId; score: number; actual: BinaryClassLabel; predictedPositive: boolean; cell: BinaryConfusionCell }`
- `ThresholdCurvePoint = { thresholdPercent: number; precision: number; recall: number; accuracy: number; falsePositiveCostTotal: number; falseNegativeCostTotal: number; totalCost: number }`
- `ThresholdClassificationInput<TId extends string = string> = { cases: readonly ThresholdClassifierCase<TId>[]; threshold: number; falsePositiveCost: number; falseNegativeCost: number; curveThresholds?: readonly number[] }`
- `ThresholdClassificationEvidence = { threshold: Probability; counts: BinaryConfusionCounts; precision: Probability; recall: Probability; accuracy: Probability; baseRate: Probability; falsePositiveCost: number; falseNegativeCost: number; falsePositiveCostTotal: number; falseNegativeCostTotal: number; totalCost: number; curve: readonly ThresholdCurvePoint[] }`
- `probabilityStatsTolerance: { default: number; tight: number; loose: number }`
- `normalizeDistribution<TId extends string>(outcomes: readonly WeightedOutcome<TId>[]): KernelResult<DiscreteDistribution<TId>>` — converts finite non-negative weights into branded probabilities that sum to 1.
- `bayesPositiveEvidence(input: BayesPositiveEvidenceInput): KernelResult<BayesPositiveEvidence>` — computes the positive-evidence Bayes update by normalising true-positive and false-positive routes.
- `thresholdCaseOutcomes<TId extends string>(cases: readonly ThresholdClassifierCase<TId>[], threshold: number): KernelResult<readonly ThresholdCaseOutcome<TId>[]>` — classifies thresholded binary cases into confusion-matrix cells.
- `binaryConfusionCounts<TId extends string>(cases: readonly ThresholdClassifierCase<TId>[], threshold: number): KernelResult<BinaryConfusionCounts>` — aggregates thresholded cases into TP/FP/TN/FN counts.
- `thresholdClassificationEvidence<TId extends string>(input: ThresholdClassificationInput<TId>): KernelResult<ThresholdClassificationEvidence>` — computes counts, precision, recall, accuracy, base rate, cost totals, and optional threshold-curve points.
- `expectedValue(distribution: DiscreteDistribution): KernelResult<number>` — computes E(X) for a validated finite distribution.
- `variance(distribution: DiscreteDistribution): KernelResult<number>` — computes Var(X) for a validated finite distribution.
- `samplingDistributionOfMean(input: SamplingDistributionOfMeanInput): KernelResult<SamplingDistributionOfMean>` — maps caller-owned random thresholds into repeated sample means and derives population/sample-mean statistics.
- `summarize(values: readonly number[], opts?: { variance?: VarianceMode }): KernelResult<SummaryStats>` — computes one-pass descriptive statistics; defaults to sample variance.
- `quantile(values: readonly number[], p: Probability): KernelResult<number>` — sorted linear-interpolation quantile.
- `zScore(value: number, mean: number, standardDeviation: number): KernelResult<number>`
- `histogram(values: readonly number[], opts: { binCount: number; domain?: Interval }): KernelResult<readonly HistogramBin[]>`

## Invariants the caller must preserve
- Distribution probabilities are branded `Probability` values and must sum to 1 within `probabilityStatsTolerance.default`.
- Outcome values, observations, bounds, and bin counts must be finite where applicable.
- Binary classifier case scores and thresholds must be valid probabilities, and
  `actual` labels must be `actual-positive` or `actual-negative`.
- Binary classifier false-positive and false-negative costs must be finite and
  non-negative.
- Sample variance requires at least two observations. Population variance requires at least one observation.
- Histogram domains are half-open per bin except the final bin, which includes `domain.max`.
- Callers own randomness and simulation state. This module only consumes explicit random thresholds supplied by the caller.

## What this module does NOT do
- Does **not** render histograms, density plots, or charts. Pair with `core/charting`.
- Does **not** fit continuous probability distributions or run hypothesis tests.
- Does **not** compute learner mastery probabilities. That is `core/bkt`.
- Does **not** schedule review or estimate memory. That is `core/fsrs`.
- Does **not** store observations, memoise results globally, or mutate caller arrays.
- Does **not** infer units or curriculum branch behavior.

## When to consider this module
Use `core/probability-stats` when a sim needs canonical expected value, variance, quantiles, descriptive summaries, z-scores, Bayes-route normalisation, binary threshold/confusion-matrix metrics, sampling distributions of means from caller-owned thresholds, or histogram bins from finite learner-controlled data. If a sim is about probability trees, random variables, normalisation, summary measures, threshold tradeoffs, or data distributions, consume this kernel instead of inlining the formulas.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for any public type change or formula/default change that shifts existing numeric outputs.

## Anti-patterns (will be rejected in PR review)
- Returning bare `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Silently normalising invalid distributions inside `expectedValue` or `variance`.
- Mutating the caller's data while sorting or binning.
- Hidden global caches or seeded random state.
- Branch-specific defaults (`if A-Level then ...`).

## How the Anieyrudh Filter reads this module
The Filter probes that **probability and data claims conserve mass and match the declared statistic**: distribution probabilities sum to 1, expected value and variance agree with the displayed random variable, histogram density integrates to 1 over the chosen domain, and summary measures do not change when a sim reorders the same observations.
