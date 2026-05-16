// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { resultantMagnitude } from "./resultant-magnitude.js";
import { runResultantMagnitudeGateContract } from "./resultant-magnitude.contract.js";

describe("resultant-magnitude sim", () => {
  it("computes perpendicular vector magnitude without scalar-summing", () => {
    expect(resultantMagnitude(5, 5, 90)).toBeCloseTo(Math.sqrt(50), 12);
    expect(resultantMagnitude(5, 5, 0)).toBeCloseTo(10, 12);
    expect(resultantMagnitude(5, 5, 180)).toBeCloseTo(0, 12);
  });

});

runResultantMagnitudeGateContract();
