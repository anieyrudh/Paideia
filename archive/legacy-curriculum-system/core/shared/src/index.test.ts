import { describe, expect, it } from "vitest";
import {
  err,
  metresPerSecondSquared,
  metresPerSecond,
  ok,
  probability,
  seconds,
  watts,
  type Function2D,
  type KernelResult,
} from "./index.js";

describe("@paideia/shared", () => {
  describe("KernelResult", () => {
    it("ok() wraps a value in the success variant", () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it("err() wraps an error code + message", () => {
      const r = err("undefined-at-point", "1/x at x=0");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("undefined-at-point");
        expect(r.error.message).toContain("1/x");
      }
    });
  });

  describe("probability()", () => {
    it("accepts values in [0, 1]", () => {
      const r = probability(0.5);
      expect(r.ok).toBe(true);
    });

    it("rejects values outside [0, 1]", () => {
      const r = probability(1.5);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("out-of-domain");
    });
  });

  describe("unit brands", () => {
    it("seconds() brands a number for compile-time safety", () => {
      const t = seconds(1.5);
      expect(t).toBe(1.5); // brand erased at runtime
    });

    it("watts() brands a number for compile-time safety", () => {
      const p = watts(15);
      expect(p).toBe(15);
    });

    it("metresPerSecond() brands a number for compile-time safety", () => {
      const v = metresPerSecond(2.5);
      expect(v).toBe(2.5);
    });

    it("metresPerSecondSquared() brands a number for compile-time safety", () => {
      const a = metresPerSecondSquared(9.8);
      expect(a).toBe(9.8);
    });
  });

  describe("Function2D", () => {
    it("is callable as a plain function", () => {
      const f: Function2D = (x) => x * x;
      expect(f(3)).toBe(9);
    });
  });
});

type _AssignableKernelResult = KernelResult<number>;
