import { describe, expect, it } from "vitest";
import {
  allowedFunctions,
  compile,
  evaluate,
  evaluateAt,
  parseExpression,
  safeFunction,
} from "./index.js";

describe("@paideia/function-eval", () => {
  it("exports a stable function whitelist", () => {
    expect(allowedFunctions).toContain("sin");
    expect(allowedFunctions).toContain("ln");
    expect(allowedFunctions).not.toContain("eval");
  });

  it("evaluates arithmetic, constants, variables, and whitelisted functions", () => {
    const result = evaluate("sin(pi / 2) + x^2 + ln(e)", { x: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(11, 12);
  });

  it("rejects identifiers outside the caller-declared variable boundary", () => {
    const result = compile("x + y", ["x"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects member access and non-whitelisted calls", () => {
    expect(parseExpression("sin.constructor('return 1')()").ok).toBe(false);
    expect(parseExpression("this").ok).toBe(false);
    expect(parseExpression("this()").ok).toBe(false);
    const result = parseExpression("random()");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("compiles one-variable expressions as Function2D callables", () => {
    const result = compile("x^2 - 2*x + 1", ["x"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value(5)).toBe(16);
  });

  it("compiled functions surface runtime failures through evaluateAt", () => {
    const result = compile("1 / (x - 1)", ["x"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(() => result.value(1)).not.toThrow();
      expect(Number.isNaN(result.value(1))).toBe(true);
      const evaluated = evaluateAt(result.value, 1);
      expect(evaluated.ok).toBe(false);
      if (!evaluated.ok) expect(evaluated.error.code).toBe("undefined-at-point");
    }
  });

  it("compiles multi-variable expressions as record callables", () => {
    const result = compile("x*y + min(x, y)", ["x", "y"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value({ x: 3, y: 4 })).toBe(15);
  });

  it("parses unary minus with standard exponent precedence", () => {
    const result = evaluate("-x^2", { x: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(-9);
  });

  it("returns undefined-at-point for non-finite results", () => {
    const division = evaluate("1 / (x - 1)", { x: 1 });
    expect(division.ok).toBe(false);
    if (!division.ok) expect(division.error.code).toBe("undefined-at-point");

    const log = evaluate("ln(0)", {});
    expect(log.ok).toBe(false);
    if (!log.ok) expect(log.error.code).toBe("undefined-at-point");
  });

  it("wraps raw functions with evaluateAt domain checks", () => {
    const f = safeFunction((x: number) => x * x, { min: -1, max: 1 });
    const inside = evaluateAt(f, 0.5);
    expect(inside.ok).toBe(true);
    if (inside.ok) expect(inside.value).toBe(0.25);

    const outside = evaluateAt(f, 2);
    expect(outside.ok).toBe(false);
    if (!outside.ok) expect(outside.error.code).toBe("out-of-domain");
  });
});
