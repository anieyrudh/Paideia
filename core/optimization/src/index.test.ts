import { describe, expect, it } from "vitest";
import {
  gradientDescent,
  linearFeasibleRegion,
  optimizationTolerance,
  optimizeLinearObjective,
  type LinearConstraint,
  type Point2,
} from "./index.js";

const unitSquare = {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
} as const;

const distance = (left: Point2, right: Point2): number =>
  Math.hypot(left[0] - right[0], left[1] - right[1]);

describe("@paideia/optimization", () => {
  it("traces gradient descent toward a convex quadratic minimizer", () => {
    const result = gradientDescent(
      (x, y) => (x - 2) ** 2 + (y + 1) ** 2,
      [5, 3],
      { learningRate: 0.2, tolerance: optimizationTolerance.loose, maxSteps: 80 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.converged).toBe(true);
    const last = result.value.steps.at(-1);
    expect(last).toBeDefined();
    if (last !== undefined) {
      expect(distance(last.point, [2, -1])).toBeLessThan(optimizationTolerance.loose * 10);
    }
  });

  it("returns out-of-domain when a descent step leaves the declared domain", () => {
    const result = gradientDescent((x, y) => -x - y, [0.9, 0.9], {
      domain: unitSquare,
      learningRate: 0.5,
      maxSteps: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.converged).toBe(false);
      expect(result.value.reason).toBe("out-of-domain");
    }
  });

  it("rejects invalid gradient descent options and undefined objectives", () => {
    const badStep = gradientDescent((x, y) => x + y, [0, 0], { learningRate: 0 });
    expect(badStep.ok).toBe(false);
    if (!badStep.ok) expect(badStep.error.code).toBe("precondition-violated");

    const undefinedObjective = gradientDescent((x) => 1 / x, [0, 0]);
    expect(undefinedObjective.ok).toBe(false);
    if (!undefinedObjective.ok) expect(undefinedObjective.error.code).toBe("undefined-at-point");
  });

  it("computes a clipped feasible polygon and linear optimum", () => {
    const constraints: readonly LinearConstraint[] = [
      { a: 1, b: 1, relation: "<=", c: 1 },
      { a: 1, b: 0, relation: ">=", c: 0 },
      { a: 0, b: 1, relation: ">=", c: 0 },
    ];
    const region = linearFeasibleRegion(constraints, unitSquare);

    expect(region.ok).toBe(true);
    if (!region.ok) return;

    expect(region.value.vertices).toHaveLength(3);
    for (const [x, y] of region.value.vertices) {
      expect(x).toBeGreaterThanOrEqual(-optimizationTolerance.loose);
      expect(y).toBeGreaterThanOrEqual(-optimizationTolerance.loose);
      expect(x + y).toBeLessThanOrEqual(1 + optimizationTolerance.loose);
    }

    const optimum = optimizeLinearObjective(region.value, {
      cx: 2,
      cy: 1,
      direction: "max",
    });
    expect(optimum.ok).toBe(true);
    if (optimum.ok) {
      expect(optimum.value.point[0]).toBeCloseTo(1, 10);
      expect(optimum.value.point[1]).toBeCloseTo(0, 10);
      expect(optimum.value.value).toBeCloseTo(2, 10);
    }
  });

  it("rejects infeasible or malformed linear programs", () => {
    const infeasible = linearFeasibleRegion(
      [
        { a: 1, b: 0, relation: ">=", c: 2 },
        { a: 1, b: 0, relation: "<=", c: 1 },
      ],
      unitSquare,
    );
    expect(infeasible.ok).toBe(false);
    if (!infeasible.ok) expect(infeasible.error.code).toBe("precondition-violated");

    const malformed = linearFeasibleRegion([{ a: 0, b: 0, relation: "<=", c: 1 }], unitSquare);
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.error.code).toBe("precondition-violated");
  });

  it("property: quadratic descent values do not increase for conservative rates", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const start: Point2 = [seed / 5 - 3, 2 - seed / 7];
      const target: Point2 = [0.25, -0.5];
      const result = gradientDescent(
        (x, y) => (x - target[0]) ** 2 + (y - target[1]) ** 2,
        start,
        { learningRate: 0.1, maxSteps: 25 },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      let previous = result.value.initial.value;
      for (const step of result.value.steps) {
        expect(step.value).toBeLessThanOrEqual(previous + optimizationTolerance.tight);
        previous = step.value;
      }
    }
  });

  it("property: every feasible-region vertex satisfies every constraint and domain bound", () => {
    const domains = [
      { x: { min: -1, max: 2 }, y: { min: -2, max: 2 } },
      { x: { min: 0, max: 4 }, y: { min: 0, max: 3 } },
    ] as const;
    const constraintSets: readonly (readonly LinearConstraint[])[] = [
      [{ a: 1, b: 1, relation: "<=", c: 2 }],
      [
        { a: 1, b: 0, relation: ">=", c: 0.5 },
        { a: 0, b: 1, relation: "<=", c: 1.5 },
      ],
      [
        { a: 1, b: -1, relation: "<=", c: 1 },
        { a: -1, b: 2, relation: "<=", c: 3 },
      ],
    ];

    for (const domain of domains) {
      for (const constraints of constraintSets) {
        const region = linearFeasibleRegion(constraints, domain);
        expect(region.ok).toBe(true);
        if (!region.ok) return;

        for (const [x, y] of region.value.vertices) {
          expect(x).toBeGreaterThanOrEqual(domain.x.min - optimizationTolerance.loose);
          expect(x).toBeLessThanOrEqual(domain.x.max + optimizationTolerance.loose);
          expect(y).toBeGreaterThanOrEqual(domain.y.min - optimizationTolerance.loose);
          expect(y).toBeLessThanOrEqual(domain.y.max + optimizationTolerance.loose);

          for (const constraint of constraints) {
            const value = constraint.a * x + constraint.b * y;
            if (constraint.relation === "<=") {
              expect(value).toBeLessThanOrEqual(constraint.c + optimizationTolerance.loose);
            } else if (constraint.relation === ">=") {
              expect(value).toBeGreaterThanOrEqual(constraint.c - optimizationTolerance.loose);
            } else {
              expect(Math.abs(value - constraint.c)).toBeLessThanOrEqual(optimizationTolerance.loose);
            }
          }
        }
      }
    }
  });
});
