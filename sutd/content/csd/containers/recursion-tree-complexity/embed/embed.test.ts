import { describe, expect, it } from "vitest";
import { createRecursionTreeComplexityEmbed } from "./index";

describe("recursion tree complexity embed API", () => {
  it("loads, saves state, scores, resumes, syncs theme, and destroys", async () => {
    const api = createRecursionTreeComplexityEmbed();
    const target = document.createElement("section");

    await api.load(target);
    expect(target.dataset.paideiaContainer).toBe("recursion-tree-complexity");
    expect(api.saveState()).toEqual({
      predictionCommitted: false,
      inputSize: 128,
      branchingFactor: 2,
      shrinkFactor: 2,
      combineExponent: 1,
    });
    expect(api.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    api.resume({
      predictionCommitted: true,
      inputSize: 81,
      branchingFactor: 3,
      shrinkFactor: 2,
      combineExponent: 1,
    });
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    api.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });
    api.destroy();
    expect(api.saveState().predictionCommitted).toBe(false);
  });
});
