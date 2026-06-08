import { describe, expect, it } from "vitest";
import { sampleFunction } from "./sampling.js";

describe("plotting sampling", () => {
  it("renders undefined function samples as gaps", () => {
    const sampled = sampleFunction(
      (x) => {
        if (x === 0) return Number.NaN;
        return 1 / x;
      },
      { min: -1, max: 1 },
      { min: -10, max: 10 },
      5,
    );

    expect(sampled.segments.length).toBe(2);
    expect(sampled.segments[0]?.at(-1)?.x).toBeLessThan(0);
    expect(sampled.segments[1]?.[0]?.x).toBeGreaterThan(0);
  });

  it("does not widen a declared range to keep out-of-range points connected", () => {
    const sampled = sampleFunction((x) => x * 100, { min: -1, max: 1 }, { min: -10, max: 10 }, 5);
    expect(sampled.segments).toHaveLength(1);
    expect(sampled.segments[0]).toEqual([{ x: 0, y: 0 }]);
  });
});
