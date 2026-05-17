import { describe, expect, it } from "vitest";
import {
  classifyLinear2D,
  dynamicalSystemTolerance,
  integrateFlow,
  iterateMap,
  jacobian2D,
  stepFlow,
  type StateVector,
} from "./index.js";

describe("@paideia/dynamical-systems", () => {
  it("steps an exponential flow with RK4 accuracy", () => {
    const result = integrateFlow((state) => [state[0] ?? 0], [1], {
      dt: 0.01,
      steps: 100,
      method: "rk4",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const final = result.value.at(-1);
      expect(final?.t).toBeCloseTo(1, 12);
      expect(final?.state[0]).toBeCloseTo(Math.E, 7);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(final?.state)).toBe(true);
    }
  });

  it("supports Euler and midpoint methods without mutating caller state", () => {
    const initial: StateVector = Object.freeze([2]);
    const euler = stepFlow((state) => [state[0] ?? 0], initial, {
      dt: 0.5,
      method: "euler",
    });
    const midpoint = stepFlow((state) => [state[0] ?? 0], initial, {
      dt: 0.5,
      method: "midpoint",
    });

    expect(initial[0]).toBe(2);
    expect(euler.ok && euler.value[0]).toBe(3);
    expect(midpoint.ok && midpoint.value[0]).toBe(3.25);
  });

  it("preserves every sampled state for a zero vector field", () => {
    const cases = [
      { initial: [0, 0] as const, dt: 0.1, steps: 5 },
      { initial: [-3, 2, 9] as const, dt: 2, steps: 8 },
      { initial: [4] as const, dt: -0.25, steps: 4 },
    ];

    for (const testCase of cases) {
      const result = integrateFlow(() => testCase.initial.map(() => 0), testCase.initial, {
        dt: testCase.dt,
        steps: testCase.steps,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const point of result.value) {
          expect(point.state).toEqual(testCase.initial);
        }
      }
    }
  });

  it("iterates discrete maps and keeps the initial step", () => {
    const logistic = iterateMap((state) => [3.2 * (state[0] ?? 0) * (1 - (state[0] ?? 0))], [0.5], {
      steps: 3,
    });

    expect(logistic.ok).toBe(true);
    if (logistic.ok) {
      expect(logistic.value.map((point) => point.step)).toEqual([0, 1, 2, 3]);
      expect(logistic.value.map((point) => point.state[0])).toEqual([0.5, 0.8, 0.512, 0.7995392]);
      expect(Object.isFrozen(logistic.value)).toBe(true);
    }
  });

  it("preserves identity-map orbits for representative states", () => {
    const states: readonly StateVector[] = [[0], [1, -1], [Math.PI, Math.E, -4]];

    for (const state of states) {
      const result = iterateMap((current) => current, state, { steps: 6 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const point of result.value) {
          expect(point.state).toEqual(state);
        }
      }
    }
  });

  it("approximates a 2D linear-system Jacobian", () => {
    const result = jacobian2D(([x, y]) => [2 * (x ?? 0) + 3 * (y ?? 0), -(x ?? 0) + 4 * (y ?? 0)], [
      1,
      -2,
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0][0]).toBeCloseTo(2, 6);
      expect(result.value[0][1]).toBeCloseTo(3, 6);
      expect(result.value[1][0]).toBeCloseTo(-1, 6);
      expect(result.value[1][1]).toBeCloseTo(4, 6);
    }
  });

  it("classifies planar linear equilibria", () => {
    const cases = [
      { matrix: [[-2, 0], [0, -1]] as const, kind: "stable-node" },
      { matrix: [[2, 0], [0, 1]] as const, kind: "unstable-node" },
      { matrix: [[1, 0], [0, -1]] as const, kind: "saddle" },
      { matrix: [[-1, -2], [2, -1]] as const, kind: "stable-spiral" },
      { matrix: [[1, -2], [2, 1]] as const, kind: "unstable-spiral" },
      { matrix: [[0, -1], [1, 0]] as const, kind: "center" },
      { matrix: [[1, 0], [0, 1]] as const, kind: "degenerate" },
    ];

    for (const testCase of cases) {
      const result = classifyLinear2D(testCase.matrix);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.kind).toBe(testCase.kind);
    }
  });

  it("reports every expected error category as KernelResult.err", () => {
    const invalidDt = stepFlow(() => [1], [1], { dt: 0 });
    expect(invalidDt.ok).toBe(false);
    if (!invalidDt.ok) expect(invalidDt.error.code).toBe("precondition-violated");

    const thrown = stepFlow(
      () => {
        throw new Error("singular");
      },
      [1],
      { dt: 0.1 },
    );
    expect(thrown.ok).toBe(false);
    if (!thrown.ok) expect(thrown.error.code).toBe("undefined-at-point");

    const exploding = integrateFlow(() => [10], [0], { dt: 1, steps: 1, maxNorm: 1 });
    expect(exploding.ok).toBe(false);
    if (!exploding.ok) expect(exploding.error.code).toBe("numerical-instability");
  });

  it("rejects dimension mismatches and invalid map options", () => {
    const mismatch = stepFlow(() => [1, 2], [0], { dt: 0.1 });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.error.code).toBe("precondition-violated");

    const invalidSteps = iterateMap((state) => state, [1], { steps: 1.5 });
    expect(invalidSteps.ok).toBe(false);
    if (!invalidSteps.ok) expect(invalidSteps.error.code).toBe("precondition-violated");
  });

  it("exposes declared tolerances for downstream sim assertions", () => {
    expect(dynamicalSystemTolerance.default).toBeLessThan(dynamicalSystemTolerance.loose);
    expect(dynamicalSystemTolerance.jacobian).toBeGreaterThan(0);
  });
});
