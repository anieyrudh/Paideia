import { describe, expect, it } from "vitest";
import { createDynamicProgrammingStateRecursionEmbed } from "./index";

describe("dynamic programming state recursion embed API", () => {
  it("loads, saves state, scores, resumes, syncs theme, and destroys", async () => {
    const api = createDynamicProgrammingStateRecursionEmbed();
    const target = document.createElement("section");

    await api.load(target);
    expect(target.dataset.paideiaContainer).toBe("dynamic-programming-state-recursion");
    expect(api.saveState()).toEqual({
      predictionCommitted: false,
      targetStep: 5,
      strategy: "memoized",
    });
    expect(api.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    api.resume({ predictionCommitted: true, targetStep: 7, strategy: "plain" });
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    api.syncTheme({ colorScheme: "dark", accentColor: "#4f9d69" });
    api.destroy();
  });
});
