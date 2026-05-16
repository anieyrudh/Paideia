import { describe, expect, it } from "vitest";
import { groupLineData, kernelDensity, makeHistogramBins, projectValue } from "./kernels.js";

describe("charting kernels", () => {
  it("bins samples without mutating the caller array", () => {
    const samples = [3, 1, 2] as const;
    const bins = makeHistogramBins(samples, 2);
    expect(samples).toEqual([3, 1, 2]);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  });

  it("copies and sorts line data per series", () => {
    const data = [
      { x: 2, y: 2, series: "a" },
      { x: 1, y: 1, series: "a" },
    ] as const;
    const group = groupLineData(data).get("a");
    expect(data[0]?.x).toBe(2);
    expect(group?.map((datum) => datum.x)).toEqual([1, 2]);
  });

  it("requires explicit log scale and rejects non-positive log values", () => {
    expect(projectValue(10, { min: 1, max: 100 }, "log")).toBeGreaterThan(0);
    expect(projectValue(0, { min: 1, max: 100 }, "log")).toBeNull();
    expect(projectValue(0, { min: 0, max: 100 }, "linear")).toBe(0);
  });

  it("computes density from samples without changing histogram semantics", () => {
    const density = kernelDensity([0, 1, 2, 3], "silverman", 12);
    expect(density).toHaveLength(12);
    expect(density.every((point) => point.y >= 0)).toBe(true);
  });
});
