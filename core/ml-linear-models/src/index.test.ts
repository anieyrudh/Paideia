import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  fitUnivariateLinearRegression,
  meanSquaredError,
  predictLinear,
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

describe("@paideia/ml-linear-models univariate linear regression", () => {
  it("fits and predicts a simple linear model", () => {
    const fit = expectOk(fitUnivariateLinearRegression({
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ],
    }));
    expect(fit.model.slope).toBeCloseTo(2, 12);
    expect(fit.model.intercept).toBeCloseTo(1, 12);
    expect(fit.residualSumOfSquares).toBeCloseTo(0, 12);
    expect(expectOk(predictLinear({ model: fit.model, x: 3 }))).toBeCloseTo(7, 12);
    expect(Object.isFrozen(fit)).toBe(true);
    expect(Object.isFrozen(fit.model)).toBe(true);
  });

  it("computes mean squared error and rejects invalid inputs", () => {
    expect(expectOk(meanSquaredError({
      model: { slope: 2, intercept: 1 },
      points: [{ x: 0, y: 2 }, { x: 1, y: 4 }],
    }))).toBeCloseTo(1, 12);
    expectErrCode(fitUnivariateLinearRegression({
      points: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
    }), "out-of-domain");
    expectErrCode(predictLinear({
      model: { slope: Number.NaN, intercept: 0 },
      x: 1,
    }), "precondition-violated");
  });

  it("recovers generated exact linear relationships", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        (slope, intercept) => {
          const fit = expectOk(fitUnivariateLinearRegression({
            points: [-2, -1, 0, 1, 2].map((x) => ({ x, y: slope * x + intercept })),
          }));
          expect(fit.model.slope).toBeCloseTo(slope, 9);
          expect(fit.model.intercept).toBeCloseTo(intercept, 9);
        },
      ),
    );
  });
});
