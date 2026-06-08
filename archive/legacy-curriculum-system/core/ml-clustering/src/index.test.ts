import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  assignToCentroids,
  kMeansStep,
  recomputeCentroids,
  squaredEuclideanDistance,
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

describe("@paideia/ml-clustering deterministic k-means primitives", () => {
  it("assigns points and recomputes centroids", () => {
    const assignments = expectOk(assignToCentroids({
      points: [[0, 0], [1, 0], [10, 0]],
      centroids: [[0, 0], [10, 0]],
    }));
    expect(assignments.assignments.map((item) => item.centroidIndex)).toEqual([0, 0, 1]);
    expect(assignments.inertia).toBeCloseTo(1, 12);
    expect(Object.isFrozen(assignments.assignments)).toBe(true);

    const centroids = expectOk(recomputeCentroids({
      points: [[0, 0], [1, 0], [10, 0]],
      assignments: assignments.assignments,
      clusterCount: 2,
    }));
    expect(centroids).toEqual([[0.5, 0], [10, 0]]);
  });

  it("runs one deterministic k-means step", () => {
    const step = expectOk(kMeansStep({
      points: [[0], [2], [10]],
      centroids: [[0], [10]],
    }));
    expect(step.centroids).toEqual([[1], [10]]);
    expect(step.inertia).toBeCloseTo(4, 12);
    expect(Object.isFrozen(step)).toBe(true);
  });

  it("rejects invalid clustering inputs", () => {
    expectErrCode(squaredEuclideanDistance([1], [1, 2]), "precondition-violated");
    expectErrCode(assignToCentroids({
      points: [[0], [1, 2]],
      centroids: [[0]],
    }), "precondition-violated");
    expectErrCode(recomputeCentroids({
      points: [[0]],
      assignments: [{ pointIndex: 2, centroidIndex: 0, squaredDistance: 0 }],
      clusterCount: 1,
    }), "precondition-violated");
  });

  it("keeps squared distance non-negative", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          expect(expectOk(squaredEuclideanDistance([a], [b]))).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});
