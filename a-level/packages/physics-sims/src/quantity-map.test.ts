// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildQuantityMapModel, formatDimension } from "./quantity-map.js";
import { runQuantityMapGateContract } from "./quantity-map.contract.js";

describe("quantity-map lab", () => {
  it("accepts only equations that match the target base dimensions", () => {
    const validForce = buildQuantityMapModel("force", "force-mass-acceleration");
    const invalidForce = buildQuantityMapModel("force", "force-mass-velocity");
    const validSpeed = buildQuantityMapModel("speed", "speed-distance-time");
    const invalidSpeed = buildQuantityMapModel("speed", "speed-distance-times-time");

    expect(validForce.isDimensionallyConsistent).toBe(true);
    expect(formatDimension(validForce.target.dimension)).toBe("M L T^-2");
    expect(invalidForce.isDimensionallyConsistent).toBe(false);
    expect(validSpeed.isDimensionallyConsistent).toBe(true);
    expect(invalidSpeed.isDimensionallyConsistent).toBe(false);
  });

  it("returns a prerequisite-first dependency path for force", () => {
    const model = buildQuantityMapModel("force", "force-mass-acceleration");

    expect(model.dependencyOrder).toEqual([
      "length",
      "mass",
      "time",
      "displacement",
      "velocity",
      "acceleration",
      "force",
    ]);
  });
});

runQuantityMapGateContract();
