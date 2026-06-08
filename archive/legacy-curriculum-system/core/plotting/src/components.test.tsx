import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { SecantLine, Tangent } from "./components.js";

describe("plotting overlays", () => {
  it("does not crash Tangent when the function throws", () => {
    const tangent = Tangent({
      at: 0,
      f: () => {
        throw new Error("undefined");
      },
    });

    expect(tangent).toBeNull();
  });

  it("does not render Tangent for non-finite function values", () => {
    expect(Tangent({ at: 1, f: () => Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("does not crash SecantLine when endpoint evaluation throws", () => {
    const secant = SecantLine({
      a: 0,
      b: 1,
      f: (x) => {
        if (x === 1) throw new Error("undefined");
        return x;
      },
    });

    expect(secant).toBeNull();
  });

  it("does not render SecantLine for non-finite endpoint values", () => {
    expect(SecantLine({ a: 0, b: 1, f: (x) => (x === 1 ? Number.NaN : x) })).toBeNull();
  });

  it("renders Tangent and SecantLine for finite inputs", () => {
    expect(isValidElement(Tangent({ at: 1, f: (x) => x * x }))).toBe(true);
    expect(isValidElement(SecantLine({ a: 0, b: 1, f: (x) => x * x }))).toBe(true);
  });
});
