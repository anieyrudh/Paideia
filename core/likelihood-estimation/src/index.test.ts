import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  bernoulliLogLikelihood,
  bernoulliMaximumLikelihood,
  normalMeanKnownSigmaLogLikelihood,
  normalMeanKnownSigmaMaximumLikelihood,
  poissonLogLikelihood,
  poissonMaximumLikelihood,
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

describe("@paideia/likelihood-estimation Bernoulli helpers", () => {
  it("computes a Bernoulli log-likelihood and MLE curve", () => {
    const logLikelihood = expectOk(bernoulliLogLikelihood({
      successes: 7,
      trials: 10,
      probability: 0.7,
    }));
    expect(logLikelihood).toBeCloseTo(7 * Math.log(0.7) + 3 * Math.log(0.3), 12);

    const mle = expectOk(bernoulliMaximumLikelihood({
      successes: 7,
      trials: 10,
      candidateProbabilities: [0.2, 0.5, 0.7, 0.9],
    }));
    expect(mle.parameterName).toBe("probability");
    expect(mle.estimate).toBeCloseTo(0.7, 12);
    expect(mle.curve.find((point) => point.parameter === 0.7)?.relativeLikelihood).toBeCloseTo(1, 12);
    expect(Object.isFrozen(mle)).toBe(true);
  });

  it("handles Bernoulli boundary likelihoods without returning NaN", () => {
    expect(expectOk(bernoulliLogLikelihood({
      successes: 0,
      trials: 5,
      probability: 0,
    }))).toBe(0);
    expect(expectOk(bernoulliLogLikelihood({
      successes: 1,
      trials: 5,
      probability: 0,
    }))).toBe(Number.NEGATIVE_INFINITY);
  });

  it("rejects invalid Bernoulli inputs", () => {
    expectErrCode(bernoulliMaximumLikelihood({
      successes: 2,
      trials: 0,
    }), "precondition-violated");
    expectErrCode(bernoulliLogLikelihood({
      successes: 11,
      trials: 10,
      probability: 0.5,
    }), "out-of-domain");
    expectErrCode(bernoulliMaximumLikelihood({
      successes: 1,
      trials: 2,
      candidateProbabilities: [0.5, 0.5],
    }), "precondition-violated");
  });

  it("places the Bernoulli MLE at successes / trials", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (trials, successesRaw) => {
          const successes = successesRaw % (trials + 1);
          const mle = expectOk(bernoulliMaximumLikelihood({ successes, trials }));
          expect(mle.estimate).toBeCloseTo(successes / trials, 12);
        },
      ),
    );
  });
});

describe("@paideia/likelihood-estimation Poisson helpers", () => {
  it("computes a Poisson log-likelihood and MLE", () => {
    const observations = [2, 3, 5, 2] as const;
    const logLikelihood = expectOk(poissonLogLikelihood({ observations, rate: 3 }));
    const expected = observations.reduce((sum, value) =>
      sum + value * Math.log(3) - 3 - Array.from({ length: value }, (_, index) => index + 1)
        .slice(1)
        .reduce((acc, n) => acc + Math.log(n), 0), 0);
    expect(logLikelihood).toBeCloseTo(expected, 12);

    const mle = expectOk(poissonMaximumLikelihood({
      observations,
      candidateRates: [1, 2, 3, 4],
    }));
    expect(mle.parameterName).toBe("rate");
    expect(mle.estimate).toBeCloseTo(3, 12);
  });

  it("rejects invalid Poisson inputs and zero-rate MLEs", () => {
    expectErrCode(poissonLogLikelihood({
      observations: [1, 2.5],
      rate: 1,
    }), "precondition-violated");
    expectErrCode(poissonLogLikelihood({
      observations: [1, 2],
      rate: 0,
    }), "precondition-violated");
    expectErrCode(poissonMaximumLikelihood({
      observations: [0, 0],
    }), "out-of-domain");
  });

  it("places the Poisson MLE at the sample mean for positive counts", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 1, maxLength: 20 }).filter((values) =>
          values.some((value) => value > 0)),
        (values) => {
          const mle = expectOk(poissonMaximumLikelihood({ observations: values }));
          const expected = values.reduce((sum, value) => sum + value, 0) / values.length;
          expect(mle.estimate).toBeCloseTo(expected, 12);
        },
      ),
    );
  });
});

describe("@paideia/likelihood-estimation normal known-sigma helpers", () => {
  it("computes a normal known-sigma log-likelihood and MLE", () => {
    const observations = [9, 10, 11] as const;
    const logLikelihood = expectOk(normalMeanKnownSigmaLogLikelihood({
      observations,
      mean: 10,
      populationStandardDeviation: 2,
    }));
    const constant = -Math.log(2 * Math.sqrt(2 * Math.PI));
    expect(logLikelihood).toBeCloseTo((3 * constant) - (2 / 8), 12);

    const mle = expectOk(normalMeanKnownSigmaMaximumLikelihood({
      observations,
      populationStandardDeviation: 2,
      candidateMeans: [8, 10, 12],
    }));
    expect(mle.parameterName).toBe("mean");
    expect(mle.estimate).toBeCloseTo(10, 12);
    expect(mle.curve.find((point) => point.parameter === 10)?.relativeLikelihood).toBeCloseTo(1, 12);
  });

  it("rejects invalid normal known-sigma inputs", () => {
    expectErrCode(normalMeanKnownSigmaMaximumLikelihood({
      observations: [],
      populationStandardDeviation: 2,
    }), "precondition-violated");
    expectErrCode(normalMeanKnownSigmaLogLikelihood({
      observations: [1, 2],
      mean: 1,
      populationStandardDeviation: 0,
    }), "precondition-violated");
  });

  it("places the normal known-sigma MLE at the sample mean", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 30,
        }),
        (values) => {
          const mle = expectOk(normalMeanKnownSigmaMaximumLikelihood({
            observations: values,
            populationStandardDeviation: 3,
          }));
          const expected = values.reduce((sum, value) => sum + value, 0) / values.length;
          expect(mle.estimate).toBeCloseTo(expected, 10);
        },
      ),
    );
  });
});
