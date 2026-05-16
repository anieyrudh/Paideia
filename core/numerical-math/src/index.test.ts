import { describe, expect, it } from "vitest";
import {
  derivative,
  derivativeAt,
  integral,
  linearRegression,
  numericalTolerance,
  riemannSum,
  secantSlope,
  taylor,
} from "./index.js";

describe("@paideia/numerical-math", () => {
  it("computes central-difference derivatives within declared tolerance", () => {
    const result = derivative((x: number) => x * x * x, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(12, 5);
  });

  it("supports Richardson derivative variants", () => {
    const result = derivativeAt(Math.sin, Math.PI / 3, { order: 4 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(Math.abs(result.value - Math.cos(Math.PI / 3))).toBeLessThan(
      numericalTolerance.default,
    );
  });

  it("computes secant slopes", () => {
    const result = secantSlope((x) => x * x, 1, 3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(4);
  });

  it("integrates with Simpson, trapezoid, and Gauss-Legendre methods", () => {
    const simpson = integral((x: number) => x * x, { min: 0, max: 1 }, { method: "simpson", n: 100 });
    expect(simpson.ok).toBe(true);
    if (simpson.ok) expect(simpson.value).toBeCloseTo(1 / 3, 10);

    const trapezoid = integral(Math.sin, { min: 0, max: Math.PI }, { method: "trapezoid", n: 5000 });
    expect(trapezoid.ok).toBe(true);
    if (trapezoid.ok) expect(trapezoid.value).toBeCloseTo(2, 5);

    const gauss = integral((x: number) => x ** 4, { min: 0, max: 1 }, { method: "gauss-legendre", n: 1 });
    expect(gauss.ok).toBe(true);
    if (gauss.ok) expect(gauss.value).toBeCloseTo(0.2, 12);
  });

  it("rejects reversed integration bounds and invalid Simpson n", () => {
    const reversed = integral((x: number) => x, { min: 1, max: 0 });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.code).toBe("precondition-violated");

    const odd = integral((x: number) => x, { min: 0, max: 1 }, { method: "simpson", n: 3 });
    expect(odd.ok).toBe(false);
    if (!odd.ok) expect(odd.error.code).toBe("precondition-violated");
  });

  it("computes left, right, and midpoint Riemann sums", () => {
    const left = riemannSum((x: number) => x, { min: 0, max: 1 }, 4, "left");
    const right = riemannSum((x: number) => x, { min: 0, max: 1 }, 4, "right");
    const midpoint = riemannSum((x: number) => x, { min: 0, max: 1 }, 4, "midpoint");

    expect(left.ok && left.value).toBe(0.375);
    expect(right.ok && right.value).toBe(0.625);
    expect(midpoint.ok && midpoint.value).toBe(0.5);
  });

  it("builds Taylor polynomials as Function2D values", () => {
    const result = taylor(Math.exp, 0, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value(0.1)).toBeCloseTo(1 + 0.1 + 0.005, 4);
  });

  it("computes linear regression without mutating points", () => {
    const points: readonly [number, number][] = [
      [0, 1],
      [1, 3],
      [2, 5],
      [3, 7],
    ];
    const before = JSON.stringify(points);
    const result = linearRegression(points);
    expect(JSON.stringify(points)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.m).toBeCloseTo(2, 12);
      expect(result.value.b).toBeCloseTo(1, 12);
      expect(result.value.r2).toBeCloseTo(1, 12);
    }
  });

  it("returns undefined-at-point when sampled functions are non-finite", () => {
    const result = derivative((x: number) => 1 / x, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("undefined-at-point");
  });
});
