// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { degrees, metres } from "@paideia/shared";
import { resultantMagnitude } from "./resultant-magnitude.js";
import { runResultantMagnitudeGateContract } from "./resultant-magnitude.contract.js";

describe("resultant-magnitude sim", () => {
  it("computes perpendicular vector magnitude without scalar-summing", () => {
    const perpendicular = resultantMagnitude(metres(5), metres(5), degrees(90));
    const sameDirection = resultantMagnitude(metres(5), metres(5), degrees(0));
    const returnPath = resultantMagnitude(metres(5), metres(5), degrees(180));

    expect(perpendicular.ok ? perpendicular.value : NaN).toBeCloseTo(Math.sqrt(50), 12);
    expect(sameDirection.ok ? sameDirection.value : NaN).toBeCloseTo(10, 12);
    expect(returnPath.ok ? returnPath.value : NaN).toBeCloseTo(0, 12);
  });
});

runResultantMagnitudeGateContract();
