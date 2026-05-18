// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { combinedDimensionDemo, evaluateEquation, formatDimension } from "./physical-quantities.js";
import { runPhysicalQuantitiesGateContract } from "./physical-quantities.contract.js";

describe("physical-quantities sim", () => {
  it("detects a missing time factor by comparing base dimensions", () => {
    const check = evaluateEquation("kinematics-missing-time");

    expect(check.consistent).toBe(false);
    expect(check.leftExpanded).toContain("L");
    expect(check.rightExpanded).toContain("T⁻¹");
  });

  it("accepts force as mass times acceleration", () => {
    const check = evaluateEquation("newton-second-law");

    expect(check.consistent).toBe(true);
    expect(formatDimension(check.challenge.left.dimension)).toBe("M L T⁻²");
    expect(combinedDimensionDemo()).toBe("M L T⁻²");
  });
});

runPhysicalQuantitiesGateContract();
