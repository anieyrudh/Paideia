import { describe, expect, it } from "vitest";
import { probability } from "@paideia/shared";
import {
  costSgdPerUnit,
  gradientDescent,
  linearFeasibleRegion,
  newsvendorCriticalFractile,
  optimizationTolerance,
  orderQuantityUnits,
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

const approxEqual = (left: number, right: number, tolerance: number): boolean =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;

const p = (value: number) => {
  const result = probability(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("@paideia/optimization", () => {
  it("computes a newsvendor critical fractile and CDF crossing", () => {
    const analysis = newsvendorCriticalFractile({
      distribution: [
        { id: "d60", value: 60, probability: p(0.12) },
        { id: "d75", value: 75, probability: p(0.2) },
        { id: "d90", value: 90, probability: p(0.32) },
        { id: "d105", value: 105, probability: p(0.24) },
        { id: "d120", value: 120, probability: p(0.12) },
      ],
      orderQuantity: orderQuantityUnits(90),
      underageCost: costSgdPerUnit(18),
      overageCost: costSgdPerUnit(6),
      quantityStep: orderQuantityUnits(5),
    });

    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;
    expect(Number(analysis.value.criticalFractile)).toBeCloseTo(0.75);
    expect(Number(analysis.value.recommendedQuantity)).toBe(105);
    expect(Number(analysis.value.recommendedServiceLevel)).toBeCloseTo(0.88);
    expect(analysis.value.dominantPenalty).toBe("shortage");
    expect(analysis.value.costCurve.length).toBeGreaterThan(5);
  });

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

    const badMaxSteps = gradientDescent((x, y) => x + y, [0, 0], { maxSteps: 0 });
    expect(badMaxSteps.ok).toBe(false);
    if (!badMaxSteps.ok) expect(badMaxSteps.error.code).toBe("precondition-violated");

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
      expect(approxEqual(optimum.value.point[0], 1, optimizationTolerance.tight)).toBe(true);
      expect(approxEqual(optimum.value.point[1], 0, optimizationTolerance.tight)).toBe(true);
      expect(approxEqual(optimum.value.value, 2, optimizationTolerance.tight)).toBe(true);
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

  it("rejects non-finite feasible-region vertices before optimizing", () => {
    const result = optimizeLinearObjective(
      {
        domain: unitSquare,
        constraints: [],
        vertices: [[Number.NaN, 0], [1, 0], [0, 1]],
      },
      { cx: 1, cy: 1, direction: "max" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects non-finite objective values before returning a solution", () => {
    const result = optimizeLinearObjective(
      {
        domain: unitSquare,
        constraints: [],
        vertices: [[Number.MAX_VALUE, 0]],
      },
      { cx: Number.MAX_VALUE, cy: 0, direction: "max" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
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
              expect(approxEqual(value, constraint.c, optimizationTolerance.loose)).toBe(true);
            }
          }
        }
      }
    }
  });
});
