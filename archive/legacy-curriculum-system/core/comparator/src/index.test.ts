import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  normalizeCriterionValue,
  pairwiseCompare,
  paretoFront,
  rankOptions,
  scoreOption,
  validateComparisonMatrix,
  type ComparisonCriterion,
  type ComparisonMatrix,
  type ComparisonOption,
  type RankedOption,
} from "./index.js";

const accuracyCriterion: ComparisonCriterion = {
  id: "accuracy",
  label: "Accuracy",
  direction: "higher-is-better",
  weight: 2,
  scale: { min: 0, max: 100 },
};

const costCriterion: ComparisonCriterion = {
  id: "cost",
  label: "Cost",
  direction: "lower-is-better",
  weight: 1,
  scale: { min: 0, max: 100 },
};

const criteria: readonly ComparisonCriterion[] = [accuracyCriterion, costCriterion];

const optionA: ComparisonOption = { id: "a", label: "A", values: { accuracy: 80, cost: 20 } };
const optionB: ComparisonOption = { id: "b", label: "B", values: { accuracy: 70, cost: 10 } };
const optionC: ComparisonOption = { id: "c", label: "C", values: { accuracy: 80, cost: 40 } };

const options: readonly ComparisonOption[] = [optionA, optionB, optionC];

const matrix: ComparisonMatrix = { criteria, options };

describe("normalizeCriterionValue", () => {
  it("normalizes higher-is-better and lower-is-better values", () => {
    expect(normalizeCriterionValue(75, accuracyCriterion)).toEqual({
      ok: true,
      value: 0.75,
    });
    expect(normalizeCriterionValue(25, costCriterion)).toEqual({
      ok: true,
      value: 0.75,
    });
  });

  it("rejects out-of-scale normalized values", () => {
    expect(normalizeCriterionValue(120, accuracyCriterion).ok).toBe(false);
    expect(normalizeCriterionValue(-1, costCriterion).ok).toBe(false);
  });

  it("keeps normalized values inside [0, 1] for valid scaled inputs", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (value) => {
        const result = normalizeCriterionValue(value, accuracyCriterion);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe("scoreOption", () => {
  it("computes weighted scores and exposes normalized contributions", () => {
    const result = scoreOption(optionA, criteria);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.optionId).toBe("a");
    expect(result.value.normalized).toEqual({ accuracy: 0.8, cost: 0.8 });
    expect(result.value.score).toBeCloseTo(0.8);
  });

  it("rejects all-zero weights", () => {
    const zeroWeightCriteria = criteria.map((criterion) => ({ ...criterion, weight: 0 }));
    expect(scoreOption(optionA, zeroWeightCriteria).ok).toBe(false);
  });
});

describe("rankOptions", () => {
  it("ranks options by score and then id", () => {
    const result = rankOptions(matrix);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((entry: RankedOption) => [entry.optionId, entry.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("does not mutate caller-owned options", () => {
    const mutable = [...options];
    const before = JSON.stringify(mutable);
    expect(rankOptions({ criteria, options: mutable }).ok).toBe(true);
    expect(JSON.stringify(mutable)).toBe(before);
  });
});

describe("pairwiseCompare", () => {
  it("reports criterion-level deltas in favored direction", () => {
    const result = pairwiseCompare(optionA, optionB, criteria);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      { criterionId: "accuracy", left: 80, right: 70, delta: 10, favored: "left" },
      { criterionId: "cost", left: 20, right: 10, delta: -10, favored: "right" },
    ]);
  });
});

describe("paretoFront", () => {
  it("keeps only non-dominated options", () => {
    const result = paretoFront(matrix);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((option: ComparisonOption) => option.id)).toEqual(["a", "b"]);
  });
});

describe("validateComparisonMatrix", () => {
  it("rejects duplicate ids, missing values, invalid scales, and bad weights", () => {
    expect(validateComparisonMatrix({ criteria: [], options }).ok).toBe(false);
    expect(validateComparisonMatrix({ criteria, options: [] }).ok).toBe(false);
    expect(validateComparisonMatrix({ criteria: [accuracyCriterion, accuracyCriterion], options }).ok).toBe(false);
    expect(validateComparisonMatrix({ criteria, options: [{ id: "x", label: "X", values: { accuracy: 1 } }] }).ok).toBe(false);
    expect(validateComparisonMatrix({
      criteria: [{ ...accuracyCriterion, scale: { min: 1, max: 1 } }],
      options: [{ id: "x", label: "X", values: { accuracy: 1 } }],
    }).ok).toBe(false);
    expect(validateComparisonMatrix({
      criteria: [{ ...accuracyCriterion, weight: -1 }],
      options: [{ id: "x", label: "X", values: { accuracy: 1 } }],
    }).ok).toBe(false);
  });
});
