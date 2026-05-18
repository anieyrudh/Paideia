// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { classifyQuantityCard } from "./physical-quantities-lab.js";
import { runPhysicalQuantitiesGateContract } from "./physical-quantities-lab.contract.js";

describe("physical-quantities unit classification lab", () => {
  it("classifies base, derived, unit-only, and number-only records", () => {
    expect(classifyQuantityCard("length", "base", "scalar")).toBe(true);
    expect(classifyQuantityCard("acceleration", "derived", "vector")).toBe(true);
    expect(classifyQuantityCard("metre-unit", "unit", "not-applicable")).toBe(true);
    expect(classifyQuantityCard("bare-number", "number", "not-applicable")).toBe(true);
    expect(classifyQuantityCard("force", "base", "vector")).toBe(false);
  });
});

runPhysicalQuantitiesGateContract();
