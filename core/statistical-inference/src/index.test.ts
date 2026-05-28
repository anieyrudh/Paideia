import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  meanConfidenceIntervalKnownSigma,
  proportionWaldConfidenceInterval,
  standardizedEffect,
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

describe("@paideia/statistical-inference confidence intervals", () => {
  it("computes a known-sigma mean confidence interval", () => {
    const interval = expectOk(meanConfidenceIntervalKnownSigma({
      sampleMean: 10,
      populationStandardDeviation: 2,
      sampleSize: 25,
      confidenceLevel: 0.95,
    }));
    expect(interval.standardError).toBeCloseTo(0.4, 12);
    expect(interval.marginOfError).toBeCloseTo(0.7839855938, 10);
    expect(interval.lower).toBeCloseTo(9.2160144062, 10);
    expect(interval.upper).toBeCloseTo(10.7839855938, 10);
    expect(Object.isFrozen(interval)).toBe(true);
  });

  it("computes a bounded Wald proportion interval", () => {
    const interval = expectOk(proportionWaldConfidenceInterval({
      successes: 45,
      trials: 100,
      confidenceLevel: 0.9,
    }));
    expect(interval.estimate).toBeCloseTo(0.45, 12);
    expect(interval.lower).toBeGreaterThanOrEqual(0);
    expect(interval.upper).toBeLessThanOrEqual(1);
  });

  it("rejects invalid interval inputs", () => {
    expectErrCode(meanConfidenceIntervalKnownSigma({
      sampleMean: 10,
      populationStandardDeviation: 0,
      sampleSize: 25,
      confidenceLevel: 0.95,
    }), "precondition-violated");
    expectErrCode(proportionWaldConfidenceInterval({
      successes: 12,
      trials: 10,
      confidenceLevel: 0.95,
    }), "out-of-domain");
    expectErrCode(meanConfidenceIntervalKnownSigma({
      sampleMean: 10,
      populationStandardDeviation: 2,
      sampleSize: 25,
      confidenceLevel: 0.8 as never,
    }), "out-of-domain");
  });

  it("shrinks known-sigma interval width as sample size increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (a, b) => {
          const small = Math.min(a, b);
          const large = Math.max(a, b);
          const wide = expectOk(meanConfidenceIntervalKnownSigma({
            sampleMean: 0,
            populationStandardDeviation: 1,
            sampleSize: small,
            confidenceLevel: 0.95,
          }));
          const narrow = expectOk(meanConfidenceIntervalKnownSigma({
            sampleMean: 0,
            populationStandardDeviation: 1,
            sampleSize: large,
            confidenceLevel: 0.95,
          }));
          expect(narrow.marginOfError).toBeLessThanOrEqual(wide.marginOfError);
        },
      ),
    );
  });
});

describe("@paideia/statistical-inference standardized effects", () => {
  it("computes signed standardized effect direction", () => {
    expect(expectOk(standardizedEffect({
      estimate: 12,
      nullValue: 10,
      standardError: 0.5,
    })).direction).toBe("above-null");
    expect(expectOk(standardizedEffect({
      estimate: 8,
      nullValue: 10,
      standardError: 0.5,
    })).direction).toBe("below-null");
    expect(expectOk(standardizedEffect({
      estimate: 10,
      nullValue: 10,
      standardError: 0.5,
    })).direction).toBe("at-null");
  });

  it("rejects invalid standardized effect inputs", () => {
    expectErrCode(standardizedEffect({
      estimate: 1,
      nullValue: 0,
      standardError: 0,
    }), "precondition-violated");
  });
});
