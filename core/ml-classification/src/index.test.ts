import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  binaryLogisticLoss,
  confusionCountsFromScores,
  linearScore,
  linearSeparatorMargin,
  perceptronStep,
  sigmoidProbability,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (result: KernelResult<unknown>, code: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

describe("@paideia/ml-classification linear scoring and sigmoid", () => {
  it("computes a finite linear score and stable sigmoid probability", () => {
    expect(expectOk(linearScore({ weights: [2, -1], features: [3, 4], bias: 0.5 }))).toBeCloseTo(2.5, 12);
    expect(expectOk(sigmoidProbability(0))).toBeCloseTo(0.5, 12);
    expect(expectOk(sigmoidProbability(1000))).toBeCloseTo(1, 12);
    expect(expectOk(sigmoidProbability(-1000))).toBeCloseTo(0, 12);
  });

  it("rejects invalid vector shapes and non-finite scores", () => {
    expectErrCode(linearScore({ weights: [], features: [], bias: 0 }), "precondition-violated");
    expectErrCode(linearScore({ weights: [1], features: [1, 2], bias: 0 }), "precondition-violated");
    expectErrCode(sigmoidProbability(Number.NaN), "precondition-violated");
  });

  it("preserves sigmoid symmetry", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -40, max: 40, noNaN: true, noDefaultInfinity: true }),
        (score) => {
          const p = expectOk(sigmoidProbability(score));
          const inverse = expectOk(sigmoidProbability(-score));
          expect(p + inverse).toBeCloseTo(1, 12);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        },
      ),
    );
  });
});

describe("@paideia/ml-classification logistic loss", () => {
  it("computes stable binary logistic loss from scores", () => {
    expect(expectOk(binaryLogisticLoss({ score: 0, label: 1 }))).toBeCloseTo(Math.log(2), 12);
    expect(expectOk(binaryLogisticLoss({ score: 2, label: 1 }))).toBeLessThan(
      expectOk(binaryLogisticLoss({ score: -2, label: 1 })),
    );
    expect(expectOk(binaryLogisticLoss({ score: -2, label: 0 }))).toBeLessThan(
      expectOk(binaryLogisticLoss({ score: 2, label: 0 })),
    );
  });

  it("rejects invalid labels and non-finite scores", () => {
    expectErrCode(binaryLogisticLoss({ score: 1, label: 2 as 0 }), "out-of-domain");
    expectErrCode(binaryLogisticLoss({ score: Number.POSITIVE_INFINITY, label: 1 }), "precondition-violated");
  });

  it("matches negative log-likelihood from sigmoid for moderate scores", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom<0 | 1>(0, 1),
        (score, label) => {
          const p = expectOk(sigmoidProbability(score));
          const expected = label === 1 ? -Math.log(p) : -Math.log(1 - p);
          expect(expectOk(binaryLogisticLoss({ score, label }))).toBeCloseTo(expected, 10);
        },
      ),
    );
  });
});

describe("@paideia/ml-classification threshold counts", () => {
  it("counts thresholded binary confusion outcomes from scores", () => {
    const counts = expectOk(confusionCountsFromScores({
      examples: [
        { score: 0.8, label: 1 },
        { score: 0.2, label: 1 },
        { score: 0.6, label: 0 },
        { score: 0.1, label: 0 },
        { score: 0.5, label: 1 },
      ],
      threshold: 0.5,
    }));
    expect(counts).toEqual({
      truePositive: 2,
      trueNegative: 1,
      falsePositive: 1,
      falseNegative: 1,
      total: 5,
    });
    expect(Object.isFrozen(counts)).toBe(true);
  });

  it("rejects empty examples, invalid labels, and invalid thresholds", () => {
    expectErrCode(confusionCountsFromScores({ examples: [], threshold: 0 }), "precondition-violated");
    expectErrCode(confusionCountsFromScores({
      examples: [{ score: 0.5, label: 3 as 0 }],
      threshold: 0,
    }), "out-of-domain");
    expectErrCode(confusionCountsFromScores({
      examples: [{ score: 0.5, label: 1 }],
      threshold: Number.NaN,
    }), "precondition-violated");
  });

  it("count totals always equal the number of examples", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
            label: fc.constantFrom<0 | 1>(0, 1),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        (examples, threshold) => {
          const counts = expectOk(confusionCountsFromScores({ examples, threshold }));
          expect(counts.truePositive + counts.trueNegative + counts.falsePositive + counts.falseNegative).toBe(
            examples.length,
          );
          expect(counts.total).toBe(examples.length);
        },
      ),
    );
  });
});

describe("@paideia/ml-classification perceptron step and margin", () => {
  it("updates misclassified points and leaves correctly classified points unchanged", () => {
    const update = expectOk(perceptronStep({
      weights: [1, 0],
      features: [1, 2],
      bias: 0,
      label: 0,
      learningRate: 0.5,
    }));
    expect(update.activated).toBe(true);
    expect(update.weights).toEqual([0.5, -1]);
    expect(update.bias).toBe(-0.5);
    expect(Object.isFrozen(update)).toBe(true);
    expect(Object.isFrozen(update.weights)).toBe(true);

    const unchanged = expectOk(perceptronStep({
      weights: [1, 0],
      features: [2, 1],
      bias: 0,
      label: 1,
      learningRate: 0.5,
    }));
    expect(unchanged.activated).toBe(false);
    expect(unchanged.weights).toEqual([1, 0]);
    expect(unchanged.bias).toBe(0);
  });

  it("computes raw and label-adjusted separator margins", () => {
    expect(expectOk(linearSeparatorMargin({
      weights: [3, 4],
      features: [5, 0],
      bias: -5,
    }))).toBeCloseTo(2, 12);
    expect(expectOk(linearSeparatorMargin({
      weights: [3, 4],
      features: [5, 0],
      bias: -5,
      label: 0,
    }))).toBeCloseTo(-2, 12);
  });

  it("rejects invalid perceptron rates and zero separator normals", () => {
    expectErrCode(perceptronStep({
      weights: [1],
      features: [1],
      bias: 0,
      label: 1,
      learningRate: 0,
    }), "out-of-domain");
    expectErrCode(linearSeparatorMargin({
      weights: [0, 0],
      features: [1, 2],
    }), "out-of-domain");
  });

  it("does not mutate caller-owned vectors", () => {
    const weights = [1, 0] as const;
    const features = [1, 2] as const;
    expectOk(perceptronStep({ weights, features, bias: 0, label: 0, learningRate: 1 }));
    expect(weights).toEqual([1, 0]);
    expect(features).toEqual([1, 2]);
  });

  it("perceptron activation strictly increases the signed activation by learningRate times augmented norm squared", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom<0 | 1>(0, 1),
        fc.double({ min: 0.001, max: 2, noNaN: true, noDefaultInfinity: true }),
        (weights, features, bias, label, learningRate) => {
          fc.pre(weights.length === features.length);
          const before = expectOk(linearScore({ weights, features, bias }));
          const step = expectOk(perceptronStep({ weights, features, bias, label, learningRate }));
          fc.pre(step.activated);
          const after = expectOk(linearScore({ weights: step.weights, features, bias: step.bias }));
          const sign = label === 1 ? 1 : -1;
          const augmentedNormSquared = features.reduce((sum, feature) => sum + feature * feature, 1);
          expect(sign * after - sign * before).toBeCloseTo(learningRate * augmentedNormSquared, 9);
        },
      ),
    );
  });
});
