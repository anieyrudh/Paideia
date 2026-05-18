// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { checkDimensions, formatDimensions } from "./dimensional-consistency.js";
import { runDimensionalConsistencyGateContract } from "./dimensional-consistency.contract.js";

describe("dimensional-consistency kernel", () => {
  it("accepts speed, force, and acceleration definitions", () => {
    expect(checkDimensions("speed", "divide", "length", "time").valid).toBe(true);
    expect(checkDimensions("force", "multiply", "mass", "acceleration").valid).toBe(true);
    expect(checkDimensions("acceleration", "divide", "velocity", "time").valid).toBe(true);
  });

  it("rejects adding unlike quantities", () => {
    const result = checkDimensions("length", "add", "speed", "time");

    expect(result.valid).toBe(false);
    expect(formatDimensions(result.left.dimensions)).toBe("L");
    expect(formatDimensions(result.rightDimensions)).toBe("L T⁻¹");
  });
});

runDimensionalConsistencyGateContract();
