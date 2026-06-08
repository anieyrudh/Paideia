# core/fairness-metrics - agent contract

## What this module is

Pure fairness-metric kernels for binary classification and group audit
simulations. It owns deterministic confusion counts by group, group rate
summaries, common group gap metrics, and threshold sweep evidence over
already-produced scores. It returns symbolic results only; model training,
threshold choice, fairness policy, harm weighting, rendering, and dataset loading
live elsewhere.

## Public interface

Exports from `@paideia/fairness-metrics`:

- `GroupName = Brand<string, "FairnessMetrics.GroupName">`
- `ProbabilityScore = Brand<number, "FairnessMetrics.ProbabilityScore">`
- `FairnessMetricName = "selectionRate" | "truePositiveRate" | "falsePositiveRate" | "falseNegativeRate" | "trueNegativeRate"`
- `EqualizedOddsControllingMetric = "truePositiveRate" | "falsePositiveRate" | "tie"`
- `BinaryGroupExample = { id: string; group: GroupName; actualPositive: boolean; predictedPositive: boolean }`
- `ScoredGroupExample = { id: string; group: GroupName; actualPositive: boolean; score: ProbabilityScore }`
- `GroupConfusionCounts = { group: GroupName; truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number; total: number; actualPositive: number; actualNegative: number; predictedPositive: number; predictedNegative: number }`
- `GroupRateMetrics = { group: GroupName; counts: GroupConfusionCounts; selectionRate: number; truePositiveRate: number; falsePositiveRate: number; falseNegativeRate: number; trueNegativeRate: number }`
- `MetricGap = { metric: FairnessMetricName; minGroup: GroupName; maxGroup: GroupName; min: number; max: number; gap: number }`
- `EqualizedOddsGap = { truePositiveRateGap: MetricGap; falsePositiveRateGap: MetricGap; maxGap: number; controllingMetric: EqualizedOddsControllingMetric }`
- `GroupAuditReport = { groups: readonly GroupName[]; metrics: readonly GroupRateMetrics[]; demographicParityGap: MetricGap; equalOpportunityGap: MetricGap; equalizedOddsMaxGap: EqualizedOddsGap }`
- `ThresholdSweepPoint = { threshold: ProbabilityScore; report: GroupAuditReport }`
- `ThresholdSweepSummary = { groups: readonly GroupName[]; thresholds: readonly ProbabilityScore[]; points: readonly ThresholdSweepPoint[] }`
- `groupName(value: string): KernelResult<GroupName>`
- `probabilityScore(value: number): KernelResult<ProbabilityScore>`
- `confusionCountsByGroup(examples: readonly BinaryGroupExample[], groups?: readonly GroupName[]): KernelResult<readonly GroupConfusionCounts[]>`
- `rateMetricsByGroup(counts: readonly GroupConfusionCounts[]): KernelResult<readonly GroupRateMetrics[]>`
- `demographicParityGap(metrics: readonly GroupRateMetrics[]): KernelResult<MetricGap>`
- `equalOpportunityGap(metrics: readonly GroupRateMetrics[]): KernelResult<MetricGap>`
- `equalizedOddsMaxGap(metrics: readonly GroupRateMetrics[]): KernelResult<EqualizedOddsGap>`
- `groupAuditReport(examples: readonly BinaryGroupExample[], groups?: readonly GroupName[]): KernelResult<GroupAuditReport>`
- `thresholdSweepSummary(examples: readonly ScoredGroupExample[], thresholds: readonly ProbabilityScore[], groups?: readonly GroupName[]): KernelResult<ThresholdSweepSummary>`

## Invariants the caller must preserve

- Group names must be non-empty trimmed strings.
- Probability scores and thresholds must be finite and in `[0, 1]`.
- Binary audit inputs require at least one example.
- Fairness gap functions require at least two distinct groups.
- Explicit group lists must be non-empty, duplicate-free, cover every example,
  and include only groups represented by at least one example.
- Example ids must be non-empty trimmed strings.
- Counts must be non-negative integers and internally consistent.
- Rate metrics are finite unit-interval values, not percentages.
- Zero-denominator TPR/FPR/FNR/TNR returns `0` so learner-facing containers can
  show the denominator instead of propagating `NaN`.
- Threshold sweep thresholds must be non-empty and duplicate-free; returned
  points are sorted by ascending threshold.
- Input arrays and caller-owned records are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not train, fit, tune, infer, calibrate, or compare machine-learning
  models.
- Does not choose a fair threshold, optimize a policy, apply group weights, or
  define protected-class semantics.
- Does not compute multiclass model metrics; use `core/model-evaluation` for
  that.
- Does not render charts, tables, dashboards, or threshold curves.
- Does not fetch datasets, parse files, anonymize records, or perform
  branch-specific mapping.

## When to consider this module

Use `core/fairness-metrics` when a container needs canonical binary group audit
evidence: per-group confusion counts, selection rate, TPR/FPR/FNR/TNR,
demographic parity gap, equal opportunity gap, equalized odds max gap, or a
threshold sweep over already-produced scores. If a sim is about to inline these
group-rate formulas, use this module instead.

## Anti-patterns

- Treating a smaller gap as a policy recommendation without container-level
  context and citations.
- Hiding denominator counts behind fairness percentages.
- Mixing percentages and unit intervals in public API outputs.
- Mutating caller-owned examples or group arrays.
- Adding stochastic estimates, global caches, external services, or dataset
  loaders.
- Adding curriculum-specific group defaults or branch flags.

## Dependency and license notes

Runtime dependencies are limited to allowed workspace packages. No third-party
runtime fairness, ML, or statistics library is bundled.

## Minimal examples

```ts
import {
  groupAuditReport,
  groupName,
} from "@paideia/fairness-metrics";

const groupA = groupName("group-a");
const groupB = groupName("group-b");

if (!groupA.ok || !groupB.ok) throw new Error("invalid group");

const report = groupAuditReport([
  { id: "case-1", group: groupA.value, actualPositive: true, predictedPositive: true },
  { id: "case-2", group: groupA.value, actualPositive: false, predictedPositive: true },
  { id: "case-3", group: groupB.value, actualPositive: true, predictedPositive: false },
  { id: "case-4", group: groupB.value, actualPositive: false, predictedPositive: false },
]);

if (report.ok) {
  console.log(report.value.demographicParityGap.gap);
}
```

## How the Anieyrudh Filter reads this module

The Filter probes that fairness claims remain evidence-grounded. Containers must
show group counts and denominators, avoid policy claims from a single metric, and
phrase gaps as audit evidence rather than proof that a system is fair or unfair.
