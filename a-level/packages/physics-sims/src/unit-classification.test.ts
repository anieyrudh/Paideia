// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  countByDirectionKind,
  countByFamily,
  equationCards,
  quantityCards,
} from "./unit-classification.js";
import { runUnitClassificationGateContract } from "./unit-classification.contract.js";

describe("unit-classification lab", () => {
  it("classifies base, derived, scalar, and vector quantities", () => {
    expect(countByFamily("base")).toBe(2);
    expect(countByFamily("derived")).toBe(3);
    expect(countByDirectionKind("scalar")).toBe(3);
    expect(countByDirectionKind("vector")).toBe(2);

    const acceleration = quantityCards.find((card) => card.id === "acceleration");
    expect(acceleration?.family).toBe("derived");
    expect(acceleration?.directionKind).toBe("vector");
    expect(acceleration?.check).toContain("m s⁻²");
  });

  it("separates dimensionally consistent equations from impossible equations", () => {
    expect(equationCards.find((card) => card.id === "distance-speed-time")?.verdict).toBe("consistent");
    expect(equationCards.find((card) => card.id === "acceleration-speed-time")?.verdict).toBe(
      "not-consistent",
    );
  });
});

runUnitClassificationGateContract();
