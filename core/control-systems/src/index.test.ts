import { describe, expect, it } from "vitest";
import { seconds } from "@paideia/shared";
import {
  addTransferFunctions,
  bode,
  closeUnityFeedbackLoop,
  controlTolerance,
  evaluateTransferFunction,
  multiplyTransferFunctions,
  pidController,
  stepResponse,
  transferFunction,
  type Complex,
  type TransferFunction,
} from "./index.js";

const expectOk = <T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (
  result:
    | { readonly ok: true }
    | { readonly ok: false; readonly error: { readonly code: string } },
  code: string,
) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

const complexAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

const complexMultiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

const expectComplexClose = (
  actual: Complex,
  expected: Complex,
  tolerance: number = controlTolerance.default,
) => {
  const digits = Math.ceil(-Math.log10(tolerance));
  expect(actual.re).toBeCloseTo(expected.re, digits);
  expect(actual.im).toBeCloseTo(expected.im, digits);
};

describe("@paideia/control-systems transfer functions", () => {
  it("normalizes denominator leading coefficients without mutating inputs", () => {
    const numerator = [0, 4, 8] as const;
    const denominator = [0, 2, 6] as const;
    const system = expectOk(transferFunction(numerator, denominator));

    expect(system.numerator).toEqual([2, 4]);
    expect(system.denominator).toEqual([1, 3]);
    expect(numerator).toEqual([0, 4, 8]);
    expect(denominator).toEqual([0, 2, 6]);
  });

  it("rejects invalid coefficient arrays and singular evaluations", () => {
    expectErrCode(transferFunction([], [1]), "precondition-violated");
    expectErrCode(transferFunction([1], [0, 0]), "precondition-violated");
    expectErrCode(transferFunction([Number.NaN], [1]), "precondition-violated");

    const integrator = expectOk(transferFunction([1], [1, 0]));
    expectErrCode(evaluateTransferFunction(integrator, { re: 0, im: 0 }), "undefined-at-point");
  });

  it("evaluates a first-order lag at s = j", () => {
    const lag = expectOk(transferFunction([1], [1, 1]));
    const value = expectOk(evaluateTransferFunction(lag, { re: 0, im: 1 }));

    expectComplexClose(value, { re: 0.5, im: -0.5 });
  });

  it("preserves transfer-function algebra over frequency evaluation", () => {
    const systems: readonly TransferFunction[] = [
      expectOk(transferFunction([1], [1, 1])),
      expectOk(transferFunction([2, 3], [1, 4, 5])),
      expectOk(transferFunction([0.5, 1.5], [1, 0.25])),
    ];
    const frequencies = [0.2, 0.7, 1.3, 3.1] as const;

    for (const a of systems) {
      for (const b of systems) {
        const sum = expectOk(addTransferFunctions(a, b));
        const product = expectOk(multiplyTransferFunctions(a, b));
        for (const frequency of frequencies) {
          const s = { re: 0, im: frequency };
          const aValue = expectOk(evaluateTransferFunction(a, s));
          const bValue = expectOk(evaluateTransferFunction(b, s));
          const sumValue = expectOk(evaluateTransferFunction(sum, s));
          const productValue = expectOk(evaluateTransferFunction(product, s));

          expectComplexClose(sumValue, complexAdd(aValue, bValue), controlTolerance.loose);
          expectComplexClose(
            productValue,
            complexMultiply(aValue, bValue),
            controlTolerance.loose,
          );
        }
      }
    }
  });

  it("closes a unity-feedback integrator into a first-order lag", () => {
    const integrator = expectOk(transferFunction([1], [1, 0]));
    const closed = expectOk(closeUnityFeedbackLoop(integrator));

    expect(closed.numerator).toEqual([1]);
    expect(closed.denominator).toEqual([1, 1]);
  });
});

describe("@paideia/control-systems PID and responses", () => {
  it("builds ideal and filtered PID transfer functions", () => {
    const ideal = expectOk(pidController({ kp: 2, ki: 3, kd: 4 }));
    expect(ideal.numerator).toEqual([4, 2, 3]);
    expect(ideal.denominator).toEqual([1, 0]);

    const filtered = expectOk(
      pidController({
        kp: 2,
        ki: 3,
        kd: 4,
        derivativeFilterTimeSeconds: seconds(0.5),
      }),
    );
    expect(filtered.numerator).toEqual([10, 7, 6]);
    expect(filtered.denominator).toEqual([1, 2, 0]);
    expectErrCode(
      pidController({
        kp: 1,
        ki: 0,
        kd: 0,
        derivativeFilterTimeSeconds: seconds(0),
      }),
      "precondition-violated",
    );
  });

  it("samples first-order step response close to the analytic curve", () => {
    const lag = expectOk(transferFunction([1], [1, 1]));
    const samples = expectOk(
      stepResponse(lag, {
        durationSeconds: seconds(1),
        dtSeconds: seconds(0.01),
      }),
    );

    expect(samples[0]?.y).toBeCloseTo(0, 8);
    const last = samples[samples.length - 1];
    expect(last?.t).toBeCloseTo(1, 10);
    expect(last?.y).toBeCloseTo(1 - Math.exp(-1), 5);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]?.y ?? 0).toBeGreaterThanOrEqual((samples[index - 1]?.y ?? 0) - 1e-10);
    }
  });

  it("rejects improper systems and runaway sample counts for step response", () => {
    const differentiator = expectOk(transferFunction([1, 0], [1]));
    expectErrCode(
      stepResponse(differentiator, {
        durationSeconds: seconds(1),
        dtSeconds: seconds(0.1),
      }),
      "precondition-violated",
    );

    const lag = expectOk(transferFunction([1], [1, 1]));
    expectErrCode(
      stepResponse(lag, {
        durationSeconds: seconds(10),
        dtSeconds: seconds(0.0001),
      }),
      "precondition-violated",
    );
  });

  it("computes Bode samples for a first-order lag", () => {
    const lag = expectOk(transferFunction([1], [1, 1]));
    const points = expectOk(bode(lag, [1]));
    const point = points[0];

    expect(point?.magnitude).toBeCloseTo(1 / Math.sqrt(2), 10);
    expect(point?.magnitudeDb).toBeCloseTo(-3.010299956639812, 10);
    expect(point?.phaseDeg).toBeCloseTo(-45, 10);
    expectErrCode(bode(lag, [0]), "precondition-violated");
  });
});
