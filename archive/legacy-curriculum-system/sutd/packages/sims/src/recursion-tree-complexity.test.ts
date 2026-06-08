import { describe, expect, it } from "vitest";
import { buildRecursionTreeComplexityModel } from "./recursion-tree-complexity.js";

describe("recursion tree complexity model", () => {
  it("classifies merge-sort style work as balanced", () => {
    const model = buildRecursionTreeComplexityModel({
      inputSize: 128,
      branchingFactor: 2,
      shrinkFactor: 2,
      combineExponent: 1,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.dominance).toBe("balanced");
    expect(model.value.asymptoticClass).toBe("Theta(n log n)");
    expect(model.value.representativeLevel.totalWork).toBe(128);
    expect(model.value.substitution).toContain("= 128 operations");
  });

  it("detects leaf-heavy recursion when branching outpaces shrinking work", () => {
    const model = buildRecursionTreeComplexityModel({
      inputSize: 81,
      branchingFactor: 3,
      shrinkFactor: 2,
      combineExponent: 1,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.dominance).toBe("leaf-heavy");
    expect(model.value.levelRatio).toBeGreaterThan(1);
    expect(model.value.asymptoticClass).toBe("Theta(n^1.585)");
  });

  it("builds deterministic tree layout and algorithm-trace evidence", () => {
    const model = buildRecursionTreeComplexityModel();

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.layout.nodes.length).toBeGreaterThan(0);
    expect(model.value.layout.links.length).toBeGreaterThan(0);
    expect(model.value.mergeTraceComparisons).toBeGreaterThan(0);
    expect(model.value.mergeTraceSteps).toBeGreaterThan(model.value.mergeTraceComparisons);
  });
});
