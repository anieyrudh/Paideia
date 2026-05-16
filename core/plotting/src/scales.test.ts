import { describe, expect, it } from "vitest";
import { createPlotScale } from "./scales.js";

const validDomain = {
  x: { min: -1, max: 1 },
  y: { min: -1, max: 1 },
} as const;

describe("plot scales", () => {
  it("maps finite non-degenerate domains to SVG coordinates", () => {
    const scale = createPlotScale(validDomain);
    expect(scale.toSvg({ x: 0, y: 0 })).toEqual({ x: 320, y: 210 });
  });

  it("rejects degenerate domains before dividing by the domain span", () => {
    expect(() =>
      createPlotScale({
        ...validDomain,
        x: { min: 1, max: 1 },
      }),
    ).toThrow("x interval must contain finite values with min < max");
  });

  it("rejects reversed domains before dividing by the domain span", () => {
    expect(() =>
      createPlotScale({
        ...validDomain,
        y: { min: 2, max: -2 },
      }),
    ).toThrow("y interval must contain finite values with min < max");
  });

  it("rejects non-finite domains before dividing by the domain span", () => {
    expect(() =>
      createPlotScale({
        ...validDomain,
        x: { min: Number.NEGATIVE_INFINITY, max: 1 },
      }),
    ).toThrow("x interval must contain finite values with min < max");
  });
});
