import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";
import {
  add2,
  checkEigenvector2,
  determinant2,
  dot2,
  eigenvalues2,
  eigenvectors2,
  gaussianElimination2,
  linearAlgebraTolerance,
  matrix2,
  multiplyMatrix2,
  multiplyMatrixVector2,
  norm2,
  normalize2,
  scale2,
  subtract2,
  trace2,
  transpose2,
  vector2,
  type Matrix2,
  type Vector2,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectCloseVector = (actual: Vector2, expected: Vector2, precision = 12): void => {
  expect(actual[0]).toBeCloseTo(expected[0], precision);
  expect(actual[1]).toBeCloseTo(expected[1], precision);
};

describe("@paideia/linear-algebra", () => {
  it("constructs finite vectors and matrices", () => {
    expectOk(vector2(1, -2));
    expectOk(matrix2(1, 2, 3, 4));

    const badVector = vector2(Number.NaN, 1);
    expect(badVector.ok).toBe(false);
    if (!badVector.ok) expect(badVector.error.code).toBe("precondition-violated");

    const badMatrix = matrix2(1, 2, Number.POSITIVE_INFINITY, 4);
    expect(badMatrix.ok).toBe(false);
    if (!badMatrix.ok) expect(badMatrix.error.code).toBe("precondition-violated");
  });

  it("computes vector arithmetic without mutating inputs", () => {
    const left: Vector2 = [3, 4];
    const right: Vector2 = [-1, 2];
    const leftBefore = JSON.stringify(left);
    const rightBefore = JSON.stringify(right);

    expectCloseVector(expectOk(add2(left, right)), [2, 6]);
    expectCloseVector(expectOk(subtract2(left, right)), [4, 2]);
    expectCloseVector(expectOk(scale2(left, 0.5)), [1.5, 2]);
    expect(expectOk(dot2(left, right))).toBe(5);
    expect(expectOk(norm2(left))).toBe(5);
    expectCloseVector(expectOk(normalize2(left)), [0.6, 0.8]);

    expect(JSON.stringify(left)).toBe(leftBefore);
    expect(JSON.stringify(right)).toBe(rightBefore);
  });

  it("rejects zero-vector normalization", () => {
    const result = normalize2([0, 0]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("computes row-major matrix operations", () => {
    const matrix: Matrix2 = [
      [1, 2],
      [3, 4],
    ];

    expect(expectOk(determinant2(matrix))).toBe(-2);
    expect(expectOk(trace2(matrix))).toBe(5);
    expect(expectOk(transpose2(matrix))).toEqual([
      [1, 3],
      [2, 4],
    ]);
    expect(expectOk(multiplyMatrixVector2(matrix, [5, 6]))).toEqual([17, 39]);
    expect(expectOk(multiplyMatrix2(matrix, [[2, 0], [1, 2]]))).toEqual([
      [4, 4],
      [10, 8],
    ]);
  });

  it("performs 2x2 Gaussian elimination with classification", () => {
    const unique = expectOk(gaussianElimination2([[2, 1], [1, -1]], [5, 1]));
    expect(unique.classification).toBe("unique");
    expectCloseVector(unique.solution ?? [0, 0], [2, 1]);

    const parallel = expectOk(gaussianElimination2([[1, 1], [2, 2]], [2, 5]));
    expect(parallel.classification).toBe("parallel");
    expect(parallel.solution).toBeNull();

    const dependent = expectOk(gaussianElimination2([[1, 1], [2, 2]], [2, 4]));
    expect(dependent.classification).toBe("dependent");
    expect(dependent.solution).toBeNull();

    const rowSwap = expectOk(gaussianElimination2([[0, 2], [1, 1]], [4, 3]));
    expect(rowSwap.classification).toBe("unique");
    expectCloseVector(rowSwap.solution ?? [0, 0], [1, 2]);
    expect(rowSwap.steps).toContain("Swap rows to move a nonzero pivot into row 1.");
  });

  it("computes real eigenvalues and normalized eigenvectors", () => {
    const matrix: Matrix2 = [
      [3, 1],
      [0, 2],
    ];

    const values = expectOk(eigenvalues2(matrix));
    expect(values[0]).toBeCloseTo(3, 12);
    expect(values[1]).toBeCloseTo(2, 12);

    const pairs = expectOk(eigenvectors2(matrix));
    for (const pair of pairs) {
      const transformed = expectOk(multiplyMatrixVector2(matrix, pair.vector));
      const expected = expectOk(scale2(pair.vector, pair.value));
      expectCloseVector(transformed, expected, 10);
      expect(expectOk(norm2(pair.vector))).toBeCloseTo(1, 12);
    }
  });

  it("checks whether a candidate vector is an eigendirection", () => {
    const matrix: Matrix2 = [
      [3, 1],
      [0, 2],
    ];

    const eigenvector = expectOk(checkEigenvector2(matrix, [1, 0]));
    expectCloseVector(eigenvector.transformed, [3, 0]);
    expect(eigenvector.lambda).toBeCloseTo(3, 12);
    expect(eigenvector.residual).toBeLessThan(linearAlgebraTolerance.loose);
    expect(eigenvector.isEigenvector).toBe(true);

    const tilted = expectOk(checkEigenvector2(matrix, [1, 1]));
    expectCloseVector(tilted.transformed, [4, 2]);
    expect(tilted.isEigenvector).toBe(false);
    expect(tilted.residual).toBeGreaterThan(linearAlgebraTolerance.loose);
  });

  it("rejects zero-vector eigendirection checks", () => {
    const result = checkEigenvector2([[1, 0], [0, 1]], [0, 0]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("returns canonical eigenvectors for scalar matrices", () => {
    const pairs = expectOk(eigenvectors2([[4, 0], [0, 4]]));
    expect(pairs).toEqual([
      { value: 4, vector: [1, 0] },
      { value: 4, vector: [0, 1] },
    ]);
  });

  it("rejects complex eigenvalues and defective repeated eigenvectors", () => {
    const rotation = eigenvalues2([[0, -1], [1, 0]]);
    expect(rotation.ok).toBe(false);
    if (!rotation.ok) expect(rotation.error.code).toBe("out-of-domain");

    const defective = eigenvectors2([[1, 1], [0, 1]]);
    expect(defective.ok).toBe(false);
    if (!defective.ok) expect(defective.error.code).toBe("precondition-violated");
  });

  it("rejects eigenvalues that would overflow from finite inputs", () => {
    const result = eigenvalues2([[1e154, 0], [0, 1e154]]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("property: dot product is distributive over vector addition", () => {
    const vectors: readonly Vector2[] = [
      [-3, 2],
      [0.25, -4],
      [5, 1.5],
      [-2.5, -0.5],
    ];

    for (const a of vectors) {
      for (const b of vectors) {
        for (const c of vectors) {
          const left = expectOk(dot2(a, expectOk(add2(b, c))));
          const right = expectOk(dot2(a, b)) + expectOk(dot2(a, c));
          expect(Math.abs(left - right)).toBeLessThan(linearAlgebraTolerance.default);
        }
      }
    }
  });

  it("property: matrix multiplication composes matrix-vector transforms", () => {
    const matrices: readonly Matrix2[] = [
      [[1, 2], [3, 4]],
      [[0, -1], [1, 0]],
      [[2, 0], [0, -0.5]],
      [[1.5, -2], [0.25, 3]],
    ];
    const vectors: readonly Vector2[] = [
      [1, 0],
      [0, 1],
      [2, -3],
      [-0.5, 4],
    ];

    for (const left of matrices) {
      for (const right of matrices) {
        const product = expectOk(multiplyMatrix2(left, right));
        for (const vector of vectors) {
          const composed = expectOk(multiplyMatrixVector2(product, vector));
          const sequential = expectOk(
            multiplyMatrixVector2(left, expectOk(multiplyMatrixVector2(right, vector))),
          );
          expectCloseVector(composed, sequential, 10);
        }
      }
    }
  });

  it("property: determinant is multiplicative for sampled 2x2 matrices", () => {
    const matrices: readonly Matrix2[] = [
      [[1, 2], [3, 4]],
      [[2, 1], [0, 3]],
      [[-1, 0.5], [4, -2]],
      [[0, -1], [1, 0]],
    ];

    for (const left of matrices) {
      for (const right of matrices) {
        const product = expectOk(multiplyMatrix2(left, right));
        const detProduct = expectOk(determinant2(product));
        const detFactors = expectOk(determinant2(left)) * expectOk(determinant2(right));
        expect(Math.abs(detProduct - detFactors)).toBeLessThan(linearAlgebraTolerance.default);
      }
    }
  });
});
