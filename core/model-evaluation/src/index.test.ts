import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  calibrationReport,
  compareAggregateMetrics,
  confusionMatrix,
  labelName,
  perLabelMetrics,
  probabilityScore,
  type ClassifiedExample,
  type ConfusionCell,
  type LabelName,
  type ScoredBinaryExample,
} from "./index";

const mustLabel = (value: string): LabelName => {
  const result = labelName(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const cat = mustLabel("cat");
const dog = mustLabel("dog");
const bird = mustLabel("bird");

describe("labelName", () => {
  it("brands non-empty trimmed labels", () => {
    expect(labelName("approved").ok).toBe(true);
  });

  it("rejects blank or padded labels", () => {
    expect(labelName("").ok).toBe(false);
    expect(labelName(" dog").ok).toBe(false);
    expect(labelName("dog ").ok).toBe(false);
  });
});

describe("probabilityScore", () => {
  it("brands finite scores in the unit interval", () => {
    expect(probabilityScore(0).ok).toBe(true);
    expect(probabilityScore(1).ok).toBe(true);
  });

  it("rejects non-finite and out-of-domain scores", () => {
    expect(probabilityScore(Number.NaN).ok).toBe(false);
    expect(probabilityScore(-0.01).ok).toBe(false);
    expect(probabilityScore(1.01).ok).toBe(false);
  });
});

describe("confusionMatrix", () => {
  it("computes multi-class cells, per-label metrics, and aggregate summaries", () => {
    const examples: readonly ClassifiedExample[] = [
      { id: "1", actual: cat, predicted: cat },
      { id: "2", actual: cat, predicted: dog },
      { id: "3", actual: dog, predicted: dog },
      { id: "4", actual: bird, predicted: cat },
    ];

    const result = confusionMatrix(examples, [cat, dog, bird]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.value.cells.find(
        (cell: ConfusionCell) => cell.actual === cat && cell.predicted === dog,
      ),
    )
      .toMatchObject({ count: 1 });
    expect(result.value.aggregate.accuracy).toBe(0.5);
    expect(result.value.aggregate.microF1).toBe(0.5);

    const catMetrics = perLabelMetrics(result.value, cat);
    expect(catMetrics.ok).toBe(true);
    if (!catMetrics.ok) return;
    expect(catMetrics.value.counts).toEqual({
      truePositive: 1,
      falsePositive: 1,
      falseNegative: 1,
      trueNegative: 1,
    });
    expect(catMetrics.value.precision).toBe(0.5);
    expect(catMetrics.value.recall).toBe(0.5);
  });

  it("infers labels in first-seen order when no explicit labels are supplied", () => {
    const result = confusionMatrix([
      { id: "1", actual: dog, predicted: cat },
      { id: "2", actual: bird, predicted: dog },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.labels).toEqual([dog, cat, bird]);
  });

  it("returns zero precision/recall/f1 instead of NaN for zero-denominator cases", () => {
    const result = confusionMatrix(
      [{ id: "1", actual: cat, predicted: cat }],
      [cat, dog],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const dogMetrics = perLabelMetrics(result.value, dog);
    expect(dogMetrics.ok).toBe(true);
    if (!dogMetrics.ok) return;
    expect(dogMetrics.value.precision).toBe(0);
    expect(dogMetrics.value.recall).toBe(0);
    expect(dogMetrics.value.f1).toBe(0);
  });

  it("rejects empty examples, duplicate labels, and uncovered examples", () => {
    expect(confusionMatrix([]).ok).toBe(false);
    expect(
      confusionMatrix([{ id: "1", actual: cat, predicted: cat }], [cat, cat]).ok,
    ).toBe(false);
    expect(
      confusionMatrix([{ id: "1", actual: cat, predicted: dog }], [cat]).ok,
    ).toBe(false);
  });

  it("does not mutate caller-owned example or label arrays", () => {
    const examples: ClassifiedExample[] = [
      { id: "1", actual: cat, predicted: dog },
      { id: "2", actual: dog, predicted: dog },
    ];
    const labels = [cat, dog];

    const beforeExamples = JSON.stringify(examples);
    const beforeLabels = JSON.stringify(labels);
    const result = confusionMatrix(examples, labels);

    expect(result.ok).toBe(true);
    expect(JSON.stringify(examples)).toBe(beforeExamples);
    expect(JSON.stringify(labels)).toBe(beforeLabels);
  });

  it("keeps aggregate metrics in [0,1] and total cell count equal to examples", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 30 }),
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 30 }),
        (actualIndices, predictedIndices) => {
          const labels = [cat, dog, bird];
          const length = Math.min(actualIndices.length, predictedIndices.length);
          const pickLabel = (index: number): LabelName => labels[index] ?? cat;
          const examples = Array.from({ length }, (_, index) => ({
            id: `case-${index}`,
            actual: pickLabel(actualIndices[index] ?? 0),
            predicted: pickLabel(predictedIndices[index] ?? 0),
          }));

          const result = confusionMatrix(examples, labels);
          expect(result.ok).toBe(true);
          if (!result.ok) return;

          const totalCells = result.value.cells.reduce(
            (sum: number, cell: ConfusionCell) => sum + cell.count,
            0,
          );
          expect(totalCells).toBe(examples.length);
          for (const metric of Object.values(result.value.aggregate)) {
            expect(metric).toBeGreaterThanOrEqual(0);
            expect(metric).toBeLessThanOrEqual(1);
          }
        },
      ),
    );
  });
});

describe("calibrationReport", () => {
  const scored = (id: string, score: number, actualPositive: boolean): ScoredBinaryExample => {
    const result = probabilityScore(score);
    if (!result.ok) throw new Error(result.error.message);
    return { id, score: result.value, actualPositive };
  };

  it("computes bucket evidence, Brier score, and expected calibration error", () => {
    const result = calibrationReport(
      [
        scored("a", 0.1, false),
        scored("b", 0.4, true),
        scored("c", 0.8, true),
        scored("d", 1, true),
      ],
      2,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.buckets).toHaveLength(2);
    expect(result.value.buckets[0]).toMatchObject({
      minScore: 0,
      maxScore: 0.5,
      count: 2,
      meanScore: 0.25,
      observedPositiveRate: 0.5,
    });
    expect(result.value.buckets[1]).toMatchObject({
      minScore: 0.5,
      maxScore: 1,
      count: 2,
      meanScore: 0.9,
      observedPositiveRate: 1,
    });
    expect(result.value.brierScore).toBeCloseTo(0.1025);
    expect(result.value.expectedCalibrationError).toBeCloseTo(0.175);
  });

  it("rejects empty reports and invalid bucket counts", () => {
    expect(calibrationReport([], 10).ok).toBe(false);
    expect(calibrationReport([scored("a", 0.5, true)], 0).ok).toBe(false);
    expect(calibrationReport([scored("a", 0.5, true)], 51).ok).toBe(false);
    expect(calibrationReport([scored("a", 0.5, true)], 2.5).ok).toBe(false);
  });

  it("keeps calibration scores in valid ranges", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
            actualPositive: fc.boolean(),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        fc.integer({ min: 1, max: 10 }),
        (rawExamples, bucketCount) => {
          const examples = rawExamples.map((example, index) =>
            scored(`case-${index}`, example.score, example.actualPositive),
          );
          const result = calibrationReport(examples, bucketCount);
          expect(result.ok).toBe(true);
          if (!result.ok) return;

          expect(result.value.brierScore).toBeGreaterThanOrEqual(0);
          expect(result.value.brierScore).toBeLessThanOrEqual(1);
          expect(result.value.expectedCalibrationError).toBeGreaterThanOrEqual(0);
          expect(result.value.expectedCalibrationError).toBeLessThanOrEqual(1);
        },
      ),
    );
  });
});

describe("compareAggregateMetrics", () => {
  it("compares finite aggregate metric values with tie tolerance", () => {
    expect(
      compareAggregateMetrics(
        { accuracy: 0.8, macroF1: 0.7, microF1: 0.8, weightedF1: 0.75 },
        { accuracy: 0.7, macroF1: 0.9, microF1: 0.7, weightedF1: 0.7 },
        "accuracy",
      ),
    ).toEqual({ ok: true, value: "left" });

    expect(
      compareAggregateMetrics(
        { accuracy: 0.8, macroF1: 0.7, microF1: 0.8, weightedF1: 0.75 },
        { accuracy: 0.8 + 1e-13, macroF1: 0.7, microF1: 0.8, weightedF1: 0.75 },
        "accuracy",
      ),
    ).toEqual({ ok: true, value: "tie" });
  });

  it("rejects non-finite metric values", () => {
    const result = compareAggregateMetrics(
      { accuracy: Number.NaN, macroF1: 0, microF1: 0, weightedF1: 0 },
      { accuracy: 0, macroF1: 0, microF1: 0, weightedF1: 0 },
      "accuracy",
    );

    expect(result.ok).toBe(false);
  });
});
