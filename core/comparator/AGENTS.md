# core/comparator - agent contract

## What this module is

Pure comparison helpers for side-by-side reasoning. It owns validated criteria,
options, weighted scoring, deterministic ranking, pairwise deltas, and Pareto
front extraction. It helps simulations explain tradeoffs without each container
inventing its own scoring math.

This package only computes comparison evidence. The consuming app owns layout,
copy, pedagogy, and whether a score should be shown to learners.

## Public interface

Exports from `@paideia/comparator`:

- `CriterionDirection = "higher-is-better" | "lower-is-better"`
- `CriterionScale = { min: number; max: number }`
- `ComparisonCriterion = { id: string; label: string; direction: CriterionDirection; weight?: number; scale?: CriterionScale }`
- `ComparisonOption = { id: string; label: string; values: Readonly<Record<string, number>> }`
- `ComparisonMatrix = { criteria: readonly ComparisonCriterion[]; options: readonly ComparisonOption[] }`
- `WeightedScore = { optionId: string; score: number; normalized: Readonly<Record<string, number>> }`
- `RankedOption = WeightedScore & { rank: number }`
- `PairwiseDelta = { criterionId: string; left: number; right: number; delta: number; favored: "left" | "right" | "tie" }`
- `normalizeCriterionValue(value: number, criterion: ComparisonCriterion): KernelResult<number>`
- `scoreOption(option: ComparisonOption, criteria: readonly ComparisonCriterion[]): KernelResult<WeightedScore>`
- `rankOptions(matrix: ComparisonMatrix): KernelResult<readonly RankedOption[]>`
- `pairwiseCompare(left: ComparisonOption, right: ComparisonOption, criteria: readonly ComparisonCriterion[]): KernelResult<readonly PairwiseDelta[]>`
- `paretoFront(matrix: ComparisonMatrix): KernelResult<readonly ComparisonOption[]>`
- `validateComparisonMatrix(matrix: ComparisonMatrix): KernelResult<ComparisonMatrix>`

## Invariants the caller must preserve

- Criterion and option ids are non-empty trimmed strings.
- Criterion ids are unique.
- Option ids are unique.
- Weights, when present, are finite and non-negative.
- At least one criterion has positive effective weight before scoring.
- Explicit scales are finite and satisfy `min < max`.
- Every option has a finite value for every criterion.
- Normalized scores are in `[0, 1]`.
- Ranking is deterministic: higher score first, then option id.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render comparison tables, radar charts, or UI.
- Does not pick criteria for a subject or curriculum.
- Does not infer missing values.
- Does not do statistics, regression, uncertainty, or hypothesis testing.
- Does not persist learner choices or telemetry.
- Does not apply branch-specific thresholds.

## When to consider this module

Use `core/comparator` when a container needs to compare designs, policies,
models, algorithms, or cases across shared criteria. If you only need a chart,
use `core/charting`; if you need optimization, use `core/optimization`.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current comparison
   consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to scoring, tie-breaking, normalization, or Pareto
   semantics.

## Anti-patterns (will be rejected in PR review)

- Hidden subjective defaults such as "cost always has weight 2".
- Mutating options or criteria while sorting.
- Treating missing values as zero.
- Branch-specific decision rules.
- Returning a winner when all criteria have zero weight.
- UI copy that tells students what to prefer.

## How the Anieyrudh Filter reads this module

The Filter probes that comparisons make tradeoffs explicit. A ranked result must
show its criteria, weights, normalization, and tie-breaking. A score that hides a
subjective weighting choice fails review.
