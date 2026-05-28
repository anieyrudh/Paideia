import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  nStepDistribution,
  nextDistribution,
  validateTransitionMatrix,
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

describe("@paideia/stochastic-processes finite Markov chains", () => {
  it("validates and advances a finite Markov chain", () => {
    const transitionMatrix = [
      [0.7, 0.3],
      [0.2, 0.8],
    ] as const;
    expectOk(validateTransitionMatrix({ transitionMatrix }));
    const result = expectOk(nextDistribution({
      distribution: [1, 0],
      transitionMatrix,
    }));
    expect(result.distribution).toEqual([0.7, 0.3]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.distribution)).toBe(true);

    const twoStep = expectOk(nStepDistribution({
      distribution: [1, 0],
      transitionMatrix,
      steps: 2,
    }));
    expect(twoStep.distribution[0]).toBeCloseTo(0.55, 12);
    expect(twoStep.distribution[1]).toBeCloseTo(0.45, 12);
  });

  it("rejects invalid transition matrices and distributions", () => {
    expectErrCode(validateTransitionMatrix({
      transitionMatrix: [[0.6, 0.6]],
    }), "precondition-violated");
    expectErrCode(validateTransitionMatrix({
      transitionMatrix: [[0.2, 0.2], [0.2, 0.8]],
    }), "out-of-domain");
    expectErrCode(nextDistribution({
      distribution: [0.5, 0.6],
      transitionMatrix: [[0.5, 0.5], [0.5, 0.5]],
    }), "out-of-domain");
  });

  it("preserves total probability for generated two-state chains", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (a, b, startA) => {
          const result = expectOk(nextDistribution({
            distribution: [startA, 1 - startA],
            transitionMatrix: [
              [a, 1 - a],
              [b, 1 - b],
            ],
          }));
          const [first, second] = result.distribution;
          expect(first).toBeDefined();
          expect(second).toBeDefined();
          expect((first ?? 0) + (second ?? 0)).toBeCloseTo(1, 9);
        },
      ),
    );
  });
});
