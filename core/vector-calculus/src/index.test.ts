import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult, Rect } from "@paideia/shared";

import {
  curl2D,
  divergence2D,
  directionalDerivative2D,
  doubleIntegralRect,
  gradient2D,
  hessian2D,
  lineIntegral2D,
  point2,
  quadraticSurfaceAt2D,
  quadraticSurfaceCoefficients2D,
  sampleVectorField2D,
  scalarLineIntegral2D,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const unitSquare: Rect = {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
};

describe("point and derivative probes", () => {
  it("constructs finite points and rejects invalid coordinates", () => {
    expect(unwrap(point2(1, 2))).toEqual([1, 2]);
    expect(point2(Number.NaN, 1).ok).toBe(false);
  });

  it("computes gradient and Hessian for a quadratic scalar field", () => {
    const at = unwrap(point2(1, 2));
    const gradient = unwrap(gradient2D((x, y) => x * x + 3 * x * y + y * y, at));
    expect(gradient.value[0]).toBeCloseTo(8, 5);
    expect(gradient.value[1]).toBeCloseTo(7, 5);

    const hessian = unwrap(hessian2D((x, y) => x * x + 3 * x * y + y * y, at));
    expect(hessian.matrix[0][0]).toBeCloseTo(2, 3);
    expect(hessian.matrix[0][1]).toBeCloseTo(3, 3);
    expect(hessian.matrix[1][0]).toBeCloseTo(3, 3);
    expect(hessian.matrix[1][1]).toBeCloseTo(2, 3);
  });

  it("computes divergence and curl for canonical vector fields", () => {
    const at = unwrap(point2(2, -1));
    expect(unwrap(divergence2D((x, y) => [x, y], at)).value).toBeCloseTo(2, 6);
    expect(unwrap(curl2D((x, y) => [-y, x], at)).zComponent).toBeCloseTo(2, 6);
  });

  it("returns KernelResult errors for thrown or non-finite user functions", () => {
    expect(gradient2D(() => Number.POSITIVE_INFINITY, unwrap(point2(0, 0))).ok).toBe(false);
    expect(curl2D(() => {
      throw new Error("bad field");
    }, unwrap(point2(0, 0))).ok).toBe(false);
  });
});

describe("quadratic surface helpers", () => {
  it("returns closed-form surface value, gradient, and Hessian", () => {
    const coefficients = unwrap(
      quadraticSurfaceCoefficients2D({
        family: "bowl",
        xCurvature: 1.2,
        xyCoupling: 0.3,
        yCurvature: 0.8,
      }),
    );
    const surface = unwrap(
      quadraticSurfaceAt2D({
        coefficients,
        point: unwrap(point2(1, 0.5)),
      }),
    );

    expect(surface.gradient.value[0]).toBeCloseTo(1.75, 12);
    expect(surface.gradient.value[1]).toBeCloseTo(0.5, 12);
    expect(surface.hessian.matrix).toEqual([
      [1.2, 0.3],
      [0.3, 0.8],
    ]);
  });

  it("projects gradients onto unit directions", () => {
    const derivative = unwrap(
      directionalDerivative2D({
        direction: [3, 4],
        gradient: {
          at: [0, 0],
          magnitude: 5,
          value: [5, 0],
        },
      }),
    );

    expect(derivative.unitDirection[0]).toBeCloseTo(0.6, 12);
    expect(derivative.unitDirection[1]).toBeCloseTo(0.8, 12);
    expect(derivative.value).toBeCloseTo(3, 12);
  });

  it("rejects non-finite coefficients and zero directions", () => {
    expect(
      quadraticSurfaceCoefficients2D({
        family: "saddle",
        xCurvature: Number.NaN,
        xyCoupling: 0,
        yCurvature: 1,
      }).ok,
    ).toBe(false);
    expect(
      directionalDerivative2D({
        direction: [0, 0],
        gradient: { at: [0, 0], magnitude: 0, value: [1, 1] },
      }).ok,
    ).toBe(false);
  });
});

describe("integrals and sampling", () => {
  it("integrates scalar fields over a rectangle", () => {
    const constant = unwrap(doubleIntegralRect(() => 2, unitSquare, { nx: 8, ny: 8 }));
    expect(constant.value).toBeCloseTo(2, 12);
    expect(constant.cells).toBe(64);
    expect(constant.samples).toHaveLength(64);

    const linear = unwrap(doubleIntegralRect((x, y) => x + y, unitSquare, { nx: 32, ny: 32 }));
    expect(linear.value).toBeCloseTo(1, 12);
  });

  it("computes work around a unit circle in a rotation field", () => {
    const result = unwrap(
      lineIntegral2D(
        (x, y) => [-y, x],
        (t) => [Math.cos(t), Math.sin(t)],
        { min: 0, max: Math.PI * 2 },
        { steps: 512 },
      ),
    );
    expect(result.value).toBeCloseTo(Math.PI * 2, 3);
    expect(result.samples).toHaveLength(512);
  });

  it("computes scalar line integral as field times arc length", () => {
    const result = unwrap(
      scalarLineIntegral2D(
        () => 3,
        (t) => [t, 0],
        { min: 0, max: 2 },
        { steps: 64 },
      ),
    );
    expect(result.value).toBeCloseTo(6, 5);
  });

  it("samples vector fields on a rectangular grid", () => {
    const samples = unwrap(sampleVectorField2D((x, y) => [x, y], unitSquare, { nx: 2, ny: 2 }));
    expect(samples).toHaveLength(4);
    expect(samples[3]?.point).toEqual([1, 1]);
    expect(samples[3]?.magnitude).toBeCloseTo(Math.SQRT2);
  });

  it("rejects invalid grids and rectangles", () => {
    expect(doubleIntegralRect(() => 1, { x: { min: 1, max: 0 }, y: { min: 0, max: 1 } }).ok).toBe(false);
    expect(sampleVectorField2D((x, y) => [x, y], unitSquare, { nx: 0 }).ok).toBe(false);
    expect(doubleIntegralRect(() => 1, unitSquare, { rule: "simpson" as "midpoint" }).ok).toBe(false);
    expect(sampleVectorField2D(() => [Number.MAX_VALUE, Number.MAX_VALUE], unitSquare, { nx: 1, ny: 1 }).ok).toBe(false);
    expect(sampleVectorField2D(() => [1, 2, 3] as unknown as readonly [number, number], unitSquare, { nx: 1, ny: 1 }).ok).toBe(false);
  });
});

describe("properties", () => {
  it("gradient of an affine function is its coefficient vector", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        (a, b, c, x, y) => {
          const gradient = unwrap(gradient2D((u, v) => a * u + b * v + c, unwrap(point2(x, y))));
          expect(gradient.value[0]).toBeCloseTo(a, 5);
          expect(gradient.value[1]).toBeCloseTo(b, 5);
        },
      ),
    );
  });
});
