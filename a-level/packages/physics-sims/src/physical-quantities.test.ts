// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  getEquationChecks,
  getQuantityCards,
  isCorrectClassification,
} from "./physical-quantities.js";
import { runPhysicalQuantitiesGateContract } from "./physical-quantities.contract.js";

describe("physical-quantities unit classification lab", () => {
  it("classifies base and derived quantities with scalar/vector status", () => {
    const cards = getQuantityCards();
    const length = cards.find((card) => card.id === "length");
    const acceleration = cards.find((card) => card.id === "acceleration");

    expect(length).toBeDefined();
    expect(acceleration).toBeDefined();
    if (length !== undefined) {
      expect(isCorrectClassification(length, "base", "scalar")).toBe(true);
      expect(isCorrectClassification(length, "derived", "scalar")).toBe(false);
    }
    if (acceleration !== undefined) {
      expect(isCorrectClassification(acceleration, "derived", "vector")).toBe(true);
      expect(isCorrectClassification(acceleration, "base", "vector")).toBe(false);
    }
  });

  it("includes both consistent and impossible equation checks", () => {
    const checks = getEquationChecks();
    expect(checks.some((check) => check.verdict === "consistent")).toBe(true);
    expect(checks.some((check) => check.verdict === "inconsistent")).toBe(true);
    expect(checks.find((check) => check.id === "bad-acceleration-note")?.rightUnit).toBe("m s^-1");
  });
});

runPhysicalQuantitiesGateContract();
