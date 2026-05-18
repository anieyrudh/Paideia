// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { checkEquation, equationScenarios, formatDimension } from "./dimensional-consistency.js";
import { runDimensionalConsistencyGateContract } from "./dimensional-consistency.contract.js";

const scenario = (id: string) => {
  const found = equationScenarios.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Missing scenario ${id}`);
  return found;
};

describe("dimensional-consistency sim", () => {
  it("rejects equations whose base-unit fingerprints differ", () => {
    const check = checkEquation(scenario("force-mass-speed"));

    expect(check.consistent).toBe(false);
    expect(formatDimension(check.leftDimension)).toBe("M L T^-2");
    expect(formatDimension(check.rightDimension)).toBe("M L T^-1");
  });

  it("accepts valid derived-unit equations", () => {
    expect(checkEquation(scenario("speed-distance-time")).consistent).toBe(true);
    expect(checkEquation(scenario("kinetic-energy")).consistent).toBe(true);
    expect(checkEquation(scenario("pressure-force-area")).consistent).toBe(true);
  });
});

runDimensionalConsistencyGateContract();
