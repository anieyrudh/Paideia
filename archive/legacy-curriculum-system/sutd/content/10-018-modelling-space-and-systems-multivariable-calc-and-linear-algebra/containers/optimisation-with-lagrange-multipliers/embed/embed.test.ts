import { describe, expect, it } from "vitest";
import { createEmbed } from "./index.js";

describe("optimisation with Lagrange multipliers embed contract", () => {
  it("exposes load, state, score, resume, theme sync, and destroy", async () => {
    const api = createEmbed();
    const target = document.createElement("div");

    await api.load(target);
    expect(target.dataset.paideiaContainer).toBe("optimisation-with-lagrange-multipliers");
    expect(api.saveState()).toEqual({ predictionCommitted: false });
    expect(api.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    api.resume({ predictionCommitted: true });
    api.syncTheme({ colorScheme: "dark", accentColor: "#7c3aed" });
    expect(target.dataset.paideiaTheme).toBe("dark");
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    api.destroy();
    expect(target.dataset.paideiaContainer).toBeUndefined();
    expect(api.score().completed).toBe(false);
  });
});
