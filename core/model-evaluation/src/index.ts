import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type LabelName = Brand<string, "ModelEvaluation.LabelName">;
export type ProbabilityScore = Brand<number, "ModelEvaluation.ProbabilityScore">;

export interface ClassifiedExample {
  readonly id: string;
  readonly actual: LabelName;
  readonly predicted: LabelName;
}

export interface ConfusionCell {
  readonly actual: LabelName;
  readonly predicted: LabelName;
  readonly count: number;
}

export interface ClassCounts {
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly falseNegative: number;
  readonly trueNegative: number;
}

export interface PerLabelMetrics {
  readonly label: LabelName;
  readonly counts: ClassCounts;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly support: number;
}

export interface AggregateMetrics {
  readonly accuracy: number;
  readonly macroF1: number;
  readonly microF1: number;
  readonly weightedF1: number;
}

export interface ConfusionMatrix {
  readonly labels: readonly LabelName[];
  readonly cells: readonly ConfusionCell[];
  readonly perLabel: readonly PerLabelMetrics[];
  readonly aggregate: AggregateMetrics;
}

export interface ScoredBinaryExample {
  readonly id: string;
  readonly score: ProbabilityScore;
  readonly actualPositive: boolean;
}

export interface CalibrationBucket {
  readonly minScore: number;
  readonly maxScore: number;
  readonly count: number;
  readonly meanScore: number;
  readonly observedPositiveRate: number;
}

export interface CalibrationReport {
  readonly buckets: readonly CalibrationBucket[];
  readonly brierScore: number;
  readonly expectedCalibrationError: number;
}

export type ModelMetric = "accuracy" | "macroF1" | "microF1" | "weightedF1";
export type ModelComparison = "left" | "right" | "tie";

const comparisonTolerance = 1e-12;
const maxCalibrationBuckets = 50;

export const labelName = (value: string): KernelResult<LabelName> => {
  if (value.trim() !== value || value.length === 0) {
    return err(
      "precondition-violated",
      "Label name must be a non-empty trimmed string",
    );
  }

  return ok(value as LabelName);
};

export const probabilityScore = (value: number): KernelResult<ProbabilityScore> => {
  if (!Number.isFinite(value)) {
    return err("precondition-violated", `Probability score must be finite; got ${value}`);
  }

  if (value < 0 || value > 1) {
    return err("out-of-domain", `Probability score must be in [0,1]; got ${value}`);
  }

  return ok(value as ProbabilityScore);
};

export const confusionMatrix = (
  examples: readonly ClassifiedExample[],
  labels?: readonly LabelName[],
): KernelResult<ConfusionMatrix> => {
  if (examples.length === 0) {
    return err("precondition-violated", "Confusion matrix requires at least one example");
  }

  const labelOrder = labels === undefined ? inferLabels(examples) : [...labels];
  const validatedLabels = validateLabelSet(labelOrder);
  if (!validatedLabels.ok) return validatedLabels;

  const labelKeys = new Set(labelOrder.map(String));
  for (const example of examples) {
    const idResult = validateExampleId(example.id);
    if (!idResult.ok) return idResult;

    const actualResult = labelName(String(example.actual));
    if (!actualResult.ok) return actualResult;

    const predictedResult = labelName(String(example.predicted));
    if (!predictedResult.ok) return predictedResult;

    if (!labelKeys.has(String(example.actual)) || !labelKeys.has(String(example.predicted))) {
      return err(
        "precondition-violated",
        `Explicit label list must cover example ${example.id}`,
      );
    }
  }

  const counts = new Map<string, number>();
  for (const actual of labelOrder) {
    for (const predicted of labelOrder) {
      counts.set(cellKey(actual, predicted), 0);
    }
  }

  for (const example of examples) {
    const key = cellKey(example.actual, example.predicted);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells = labelOrder.flatMap((actual) =>
    labelOrder.map((predicted) => ({
      actual,
      predicted,
      count: counts.get(cellKey(actual, predicted)) ?? 0,
    })),
  );

  const perLabel = labelOrder.map((label) =>
    computePerLabel(label, labelOrder, counts, examples.length),
  );

  const aggregate = computeAggregate(perLabel, examples.length);
  return ok({
    labels: labelOrder,
    cells,
    perLabel,
    aggregate,
  });
};

export const perLabelMetrics = (
  matrix: ConfusionMatrix,
  label: LabelName,
): KernelResult<PerLabelMetrics> => {
  const validLabel = labelName(String(label));
  if (!validLabel.ok) return validLabel;

  const metric = matrix.perLabel.find((entry) => entry.label === label);
  if (metric === undefined) {
    return err("precondition-violated", `Label ${label} is not present in the matrix`);
  }

  return ok(metric);
};

export const calibrationReport = (
  examples: readonly ScoredBinaryExample[],
  bucketCount: number,
): KernelResult<CalibrationReport> => {
  if (examples.length === 0) {
    return err("precondition-violated", "Calibration report requires at least one example");
  }

  if (!Number.isInteger(bucketCount) || bucketCount < 1 || bucketCount > maxCalibrationBuckets) {
    return err(
      "out-of-domain",
      `Calibration bucket count must be an integer from 1 to ${maxCalibrationBuckets}`,
    );
  }

  const bucketTotals = Array.from({ length: bucketCount }, () => ({
    count: 0,
    scoreSum: 0,
    positiveCount: 0,
  }));

  let brierSum = 0;
  for (const example of examples) {
    const idResult = validateExampleId(example.id);
    if (!idResult.ok) return idResult;

    const scoreResult = probabilityScore(Number(example.score));
    if (!scoreResult.ok) return scoreResult;

    const score = Number(scoreResult.value);
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(score * bucketCount));
    const bucket = bucketTotals[bucketIndex];
    if (bucket === undefined) {
      return err("numerical-instability", "Calibration bucket lookup failed");
    }

    bucket.count += 1;
    bucket.scoreSum += score;
    bucket.positiveCount += example.actualPositive ? 1 : 0;
    brierSum += (score - (example.actualPositive ? 1 : 0)) ** 2;
  }

  let expectedCalibrationError = 0;
  const buckets = bucketTotals.map((bucket, index) => {
    const minScore = index / bucketCount;
    const maxScore = (index + 1) / bucketCount;
    const meanScore =
      bucket.count === 0 ? (minScore + maxScore) / 2 : bucket.scoreSum / bucket.count;
    const observedPositiveRate =
      bucket.count === 0 ? 0 : bucket.positiveCount / bucket.count;

    expectedCalibrationError +=
      (bucket.count / examples.length) * Math.abs(meanScore - observedPositiveRate);

    return {
      minScore,
      maxScore,
      count: bucket.count,
      meanScore,
      observedPositiveRate,
    };
  });

  return ok({
    buckets,
    brierScore: brierSum / examples.length,
    expectedCalibrationError,
  });
};

export const compareAggregateMetrics = (
  left: AggregateMetrics,
  right: AggregateMetrics,
  metric: ModelMetric,
): KernelResult<ModelComparison> => {
  const leftValue = metricValue(left, metric);
  const rightValue = metricValue(right, metric);

  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
    return err("precondition-violated", `${metric} values must be finite`);
  }

  if (Math.abs(leftValue - rightValue) <= comparisonTolerance) {
    return ok("tie");
  }

  return ok(leftValue > rightValue ? "left" : "right");
};

const inferLabels = (examples: readonly ClassifiedExample[]): LabelName[] => {
  const labels: LabelName[] = [];
  const seen = new Set<string>();

  for (const example of examples) {
    for (const label of [example.actual, example.predicted]) {
      const key = String(label);
      if (!seen.has(key)) {
        seen.add(key);
        labels.push(label);
      }
    }
  }

  return labels;
};

const validateLabelSet = (labels: readonly LabelName[]): KernelResult<readonly LabelName[]> => {
  if (labels.length === 0) {
    return err("precondition-violated", "Label list must contain at least one label");
  }

  const seen = new Set<string>();
  for (const label of labels) {
    const result = labelName(String(label));
    if (!result.ok) return result;

    const key = String(label);
    if (seen.has(key)) {
      return err("precondition-violated", `Duplicate label ${key}`);
    }

    seen.add(key);
  }

  return ok(labels);
};

const validateExampleId = (id: string): KernelResult<string> =>
  id.length > 0 && id.trim() === id
    ? ok(id)
    : err("precondition-violated", "Example id must be a non-empty trimmed string");

const cellKey = (actual: LabelName, predicted: LabelName): string =>
  `${String(actual)}\u0000${String(predicted)}`;

const safeRatio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

const f1Score = (precision: number, recall: number): number =>
  precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

const computePerLabel = (
  label: LabelName,
  labels: readonly LabelName[],
  counts: ReadonlyMap<string, number>,
  total: number,
): PerLabelMetrics => {
  const truePositive = counts.get(cellKey(label, label)) ?? 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const other of labels) {
    if (other !== label) {
      falsePositive += counts.get(cellKey(other, label)) ?? 0;
      falseNegative += counts.get(cellKey(label, other)) ?? 0;
    }
  }

  const trueNegative = total - truePositive - falsePositive - falseNegative;
  const precision = safeRatio(truePositive, truePositive + falsePositive);
  const recall = safeRatio(truePositive, truePositive + falseNegative);

  return {
    label,
    counts: {
      truePositive,
      falsePositive,
      falseNegative,
      trueNegative,
    },
    precision,
    recall,
    f1: f1Score(precision, recall),
    support: truePositive + falseNegative,
  };
};

const computeAggregate = (
  perLabel: readonly PerLabelMetrics[],
  total: number,
): AggregateMetrics => {
  const correct = perLabel.reduce((sum, metric) => sum + metric.counts.truePositive, 0);
  const truePositive = correct;
  const falsePositive = perLabel.reduce(
    (sum, metric) => sum + metric.counts.falsePositive,
    0,
  );
  const falseNegative = perLabel.reduce(
    (sum, metric) => sum + metric.counts.falseNegative,
    0,
  );
  const microPrecision = safeRatio(truePositive, truePositive + falsePositive);
  const microRecall = safeRatio(truePositive, truePositive + falseNegative);
  const macroF1 =
    perLabel.length === 0
      ? 0
      : perLabel.reduce((sum, metric) => sum + metric.f1, 0) / perLabel.length;
  const weightedF1 =
    total === 0
      ? 0
      : perLabel.reduce((sum, metric) => sum + metric.f1 * metric.support, 0) / total;

  return {
    accuracy: safeRatio(correct, total),
    macroF1,
    microF1: f1Score(microPrecision, microRecall),
    weightedF1,
  };
};

const metricValue = (metrics: AggregateMetrics, metric: ModelMetric): number => {
  switch (metric) {
    case "accuracy":
      return metrics.accuracy;
    case "macroF1":
      return metrics.macroF1;
    case "microF1":
      return metrics.microF1;
    case "weightedF1":
      return metrics.weightedF1;
  }
};
