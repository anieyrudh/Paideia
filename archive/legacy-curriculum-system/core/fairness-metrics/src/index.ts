import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type GroupName = Brand<string, "FairnessMetrics.GroupName">;
export type ProbabilityScore = Brand<number, "FairnessMetrics.ProbabilityScore">;
export type FairnessMetricName =
  | "selectionRate"
  | "truePositiveRate"
  | "falsePositiveRate"
  | "falseNegativeRate"
  | "trueNegativeRate";
export type EqualizedOddsControllingMetric = "truePositiveRate" | "falsePositiveRate" | "tie";

export interface BinaryGroupExample {
  readonly id: string;
  readonly group: GroupName;
  readonly actualPositive: boolean;
  readonly predictedPositive: boolean;
}

export interface ScoredGroupExample {
  readonly id: string;
  readonly group: GroupName;
  readonly actualPositive: boolean;
  readonly score: ProbabilityScore;
}

export interface GroupConfusionCounts {
  readonly group: GroupName;
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly trueNegative: number;
  readonly falseNegative: number;
  readonly total: number;
  readonly actualPositive: number;
  readonly actualNegative: number;
  readonly predictedPositive: number;
  readonly predictedNegative: number;
}

export interface GroupRateMetrics {
  readonly group: GroupName;
  readonly counts: GroupConfusionCounts;
  readonly selectionRate: number;
  readonly truePositiveRate: number;
  readonly falsePositiveRate: number;
  readonly falseNegativeRate: number;
  readonly trueNegativeRate: number;
}

export interface MetricGap {
  readonly metric: FairnessMetricName;
  readonly minGroup: GroupName;
  readonly maxGroup: GroupName;
  readonly min: number;
  readonly max: number;
  readonly gap: number;
}

export interface EqualizedOddsGap {
  readonly truePositiveRateGap: MetricGap;
  readonly falsePositiveRateGap: MetricGap;
  readonly maxGap: number;
  readonly controllingMetric: EqualizedOddsControllingMetric;
}

export interface GroupAuditReport {
  readonly groups: readonly GroupName[];
  readonly metrics: readonly GroupRateMetrics[];
  readonly demographicParityGap: MetricGap;
  readonly equalOpportunityGap: MetricGap;
  readonly equalizedOddsMaxGap: EqualizedOddsGap;
}

export interface ThresholdSweepPoint {
  readonly threshold: ProbabilityScore;
  readonly report: GroupAuditReport;
}

export interface ThresholdSweepSummary {
  readonly groups: readonly GroupName[];
  readonly thresholds: readonly ProbabilityScore[];
  readonly points: readonly ThresholdSweepPoint[];
}

type MutableGroupConfusionCounts = {
  group: GroupName;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
};

export const groupName = (value: string): KernelResult<GroupName> => {
  const trimmed = value.trim();
  return trimmed.length > 0
    ? ok(trimmed as GroupName)
    : err("precondition-violated", "group name must be a non-empty trimmed string");
};

export const probabilityScore = (value: number): KernelResult<ProbabilityScore> =>
  Number.isFinite(value) && value >= 0 && value <= 1
    ? ok(value as ProbabilityScore)
    : err("out-of-domain", `probability score must be finite and in [0, 1], got ${value}`);

const assertId = (id: string, label: string): KernelResult<void> =>
  id.trim().length > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a non-empty trimmed string`);

const assertBoolean = (value: boolean, label: string): KernelResult<void> =>
  typeof value === "boolean"
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a boolean`);

const validateGroups = (
  examples: readonly { readonly group: GroupName }[],
  groups?: readonly GroupName[],
): KernelResult<readonly GroupName[]> => {
  if (examples.length === 0) {
    return err("precondition-violated", "examples must not be empty");
  }
  const observed = new Set<string>();
  const observedOrder: GroupName[] = [];
  for (const example of examples) {
    const checked = groupName(example.group);
    if (!checked.ok) return checked;
    if (!observed.has(checked.value)) {
      observed.add(checked.value);
      observedOrder.push(checked.value);
    }
  }
  if (groups === undefined) return ok(Object.freeze(observedOrder));
  if (groups.length === 0) {
    return err("precondition-violated", "groups must not be empty when supplied");
  }
  const explicit = new Set<string>();
  const out: GroupName[] = [];
  for (const [index, group] of groups.entries()) {
    const checked = groupName(group);
    if (!checked.ok) return checked;
    if (explicit.has(checked.value)) {
      return err("precondition-violated", `groups[${index}] duplicates ${checked.value}`);
    }
    if (!observed.has(checked.value)) {
      return err("out-of-domain", `groups[${index}] is not represented by any example`);
    }
    explicit.add(checked.value);
    out.push(checked.value);
  }
  for (const group of observed) {
    if (!explicit.has(group)) {
      return err("out-of-domain", `groups does not cover observed group ${group}`);
    }
  }
  return ok(Object.freeze(out));
};

const zeroCounts = (group: GroupName): MutableGroupConfusionCounts => ({
  group,
  truePositive: 0,
  falsePositive: 0,
  trueNegative: 0,
  falseNegative: 0,
});

const freezeCounts = (counts: Pick<GroupConfusionCounts, "group" | "truePositive" | "falsePositive" | "trueNegative" | "falseNegative">): GroupConfusionCounts =>
  Object.freeze({
    group: counts.group,
    truePositive: counts.truePositive,
    falsePositive: counts.falsePositive,
    trueNegative: counts.trueNegative,
    falseNegative: counts.falseNegative,
    total: counts.truePositive + counts.falsePositive + counts.trueNegative + counts.falseNegative,
    actualPositive: counts.truePositive + counts.falseNegative,
    actualNegative: counts.trueNegative + counts.falsePositive,
    predictedPositive: counts.truePositive + counts.falsePositive,
    predictedNegative: counts.trueNegative + counts.falseNegative,
  });

export const confusionCountsByGroup = (
  examples: readonly BinaryGroupExample[],
  groups?: readonly GroupName[],
): KernelResult<readonly GroupConfusionCounts[]> => {
  const resolvedGroups = validateGroups(examples, groups);
  if (!resolvedGroups.ok) return resolvedGroups;
  const byGroup = new Map<string, MutableGroupConfusionCounts>();
  for (const group of resolvedGroups.value) byGroup.set(group, zeroCounts(group));

  for (const [index, example] of examples.entries()) {
    const id = assertId(example.id, `examples[${index}].id`);
    if (!id.ok) return id;
    const actual = assertBoolean(example.actualPositive, `examples[${index}].actualPositive`);
    if (!actual.ok) return actual;
    const predicted = assertBoolean(example.predictedPositive, `examples[${index}].predictedPositive`);
    if (!predicted.ok) return predicted;
    const checkedGroup = groupName(example.group);
    if (!checkedGroup.ok) return checkedGroup;
    const counts = byGroup.get(checkedGroup.value);
    if (counts === undefined) {
      return err("out-of-domain", `example group ${checkedGroup.value} is not in groups`);
    }
    if (example.actualPositive && example.predictedPositive) counts.truePositive += 1;
    if (!example.actualPositive && example.predictedPositive) counts.falsePositive += 1;
    if (!example.actualPositive && !example.predictedPositive) counts.trueNegative += 1;
    if (example.actualPositive && !example.predictedPositive) counts.falseNegative += 1;
  }

  return ok(Object.freeze(resolvedGroups.value.map((group) => freezeCounts(byGroup.get(group)!))));
};

const assertCounts = (counts: readonly GroupConfusionCounts[]): KernelResult<void> => {
  if (counts.length === 0) {
    return err("precondition-violated", "counts must not be empty");
  }
  const seen = new Set<string>();
  for (const [index, count] of counts.entries()) {
    const group = groupName(count.group);
    if (!group.ok) return group;
    if (seen.has(group.value)) {
      return err("precondition-violated", `counts[${index}].group duplicates ${group.value}`);
    }
    seen.add(group.value);
    for (const field of ["truePositive", "falsePositive", "trueNegative", "falseNegative"] as const) {
      if (!Number.isInteger(count[field]) || count[field] < 0) {
        return err("precondition-violated", `counts[${index}].${field} must be a non-negative integer`);
      }
    }
    const recomputed = freezeCounts(count);
    if (
      count.total !== recomputed.total ||
      count.actualPositive !== recomputed.actualPositive ||
      count.actualNegative !== recomputed.actualNegative ||
      count.predictedPositive !== recomputed.predictedPositive ||
      count.predictedNegative !== recomputed.predictedNegative
    ) {
      return err("precondition-violated", `counts[${index}] totals are internally inconsistent`);
    }
  }
  return ok(undefined);
};

const rate = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

export const rateMetricsByGroup = (
  counts: readonly GroupConfusionCounts[],
): KernelResult<readonly GroupRateMetrics[]> => {
  const checked = assertCounts(counts);
  if (!checked.ok) return checked;
  return ok(Object.freeze(counts.map((count) => Object.freeze({
    group: count.group,
    counts: Object.freeze({ ...count }),
    selectionRate: rate(count.predictedPositive, count.total),
    truePositiveRate: rate(count.truePositive, count.actualPositive),
    falsePositiveRate: rate(count.falsePositive, count.actualNegative),
    falseNegativeRate: rate(count.falseNegative, count.actualPositive),
    trueNegativeRate: rate(count.trueNegative, count.actualNegative),
  }))));
};

const metricGap = (
  metrics: readonly GroupRateMetrics[],
  metric: FairnessMetricName,
): KernelResult<MetricGap> => {
  if (metrics.length < 2) {
    return err("precondition-violated", "at least two groups are required");
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let minGroup = metrics[0]!.group;
  let maxGroup = metrics[0]!.group;
  for (const item of metrics) {
    const value = item[metric];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return err("precondition-violated", `${metric} must be a finite unit interval`);
    }
    if (value < min) {
      min = value;
      minGroup = item.group;
    }
    if (value > max) {
      max = value;
      maxGroup = item.group;
    }
  }
  return ok(Object.freeze({ metric, minGroup, maxGroup, min, max, gap: max - min }));
};

export const demographicParityGap = (metrics: readonly GroupRateMetrics[]): KernelResult<MetricGap> =>
  metricGap(metrics, "selectionRate");

export const equalOpportunityGap = (metrics: readonly GroupRateMetrics[]): KernelResult<MetricGap> =>
  metricGap(metrics, "truePositiveRate");

export const equalizedOddsMaxGap = (
  metrics: readonly GroupRateMetrics[],
): KernelResult<EqualizedOddsGap> => {
  const truePositiveRateGap = metricGap(metrics, "truePositiveRate");
  if (!truePositiveRateGap.ok) return truePositiveRateGap;
  const falsePositiveRateGap = metricGap(metrics, "falsePositiveRate");
  if (!falsePositiveRateGap.ok) return falsePositiveRateGap;
  const delta = Math.abs(truePositiveRateGap.value.gap - falsePositiveRateGap.value.gap);
  const controllingMetric =
    delta <= 1e-12
      ? "tie"
      : truePositiveRateGap.value.gap > falsePositiveRateGap.value.gap
        ? "truePositiveRate"
        : "falsePositiveRate";
  return ok(Object.freeze({
    truePositiveRateGap: truePositiveRateGap.value,
    falsePositiveRateGap: falsePositiveRateGap.value,
    maxGap: Math.max(truePositiveRateGap.value.gap, falsePositiveRateGap.value.gap),
    controllingMetric,
  }));
};

export const groupAuditReport = (
  examples: readonly BinaryGroupExample[],
  groups?: readonly GroupName[],
): KernelResult<GroupAuditReport> => {
  const counts = confusionCountsByGroup(examples, groups);
  if (!counts.ok) return counts;
  const metrics = rateMetricsByGroup(counts.value);
  if (!metrics.ok) return metrics;
  const demographic = demographicParityGap(metrics.value);
  if (!demographic.ok) return demographic;
  const opportunity = equalOpportunityGap(metrics.value);
  if (!opportunity.ok) return opportunity;
  const odds = equalizedOddsMaxGap(metrics.value);
  if (!odds.ok) return odds;
  return ok(Object.freeze({
    groups: Object.freeze(metrics.value.map((item) => item.group)),
    metrics: metrics.value,
    demographicParityGap: demographic.value,
    equalOpportunityGap: opportunity.value,
    equalizedOddsMaxGap: odds.value,
  }));
};

export const thresholdSweepSummary = (
  examples: readonly ScoredGroupExample[],
  thresholds: readonly ProbabilityScore[],
  groups?: readonly GroupName[],
): KernelResult<ThresholdSweepSummary> => {
  if (thresholds.length === 0) {
    return err("precondition-violated", "thresholds must not be empty");
  }
  const seen = new Set<number>();
  const checkedThresholds: ProbabilityScore[] = [];
  for (const [index, threshold] of thresholds.entries()) {
    const checked = probabilityScore(threshold);
    if (!checked.ok) return checked;
    if (seen.has(checked.value)) {
      return err("precondition-violated", `thresholds[${index}] duplicates ${checked.value}`);
    }
    seen.add(checked.value);
    checkedThresholds.push(checked.value);
  }
  for (const [index, example] of examples.entries()) {
    const id = assertId(example.id, `examples[${index}].id`);
    if (!id.ok) return id;
    const actual = assertBoolean(example.actualPositive, `examples[${index}].actualPositive`);
    if (!actual.ok) return actual;
    const score = probabilityScore(example.score);
    if (!score.ok) return score;
  }
  const sorted = Object.freeze([...checkedThresholds].sort((a, b) => a - b));
  const points: ThresholdSweepPoint[] = [];
  for (const threshold of sorted) {
    const report = groupAuditReport(examples.map((example) => ({
      id: example.id,
      group: example.group,
      actualPositive: example.actualPositive,
      predictedPositive: example.score >= threshold,
    })), groups);
    if (!report.ok) return report;
    points.push(Object.freeze({ threshold, report: report.value }));
  }
  return ok(Object.freeze({
    groups: Object.freeze(points[0]?.report.groups ?? []),
    thresholds: sorted,
    points: Object.freeze(points),
  }));
};
