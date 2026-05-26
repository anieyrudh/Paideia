import { describe, expect, it } from "vitest";
import { createEmbed } from "./index.js";

describe("double and triple integrals embed contract", () => {
  it("exposes load, state, score, resume, theme sync, and destroy", async () => {
    const api = createEmbed();
    const target = document.createElement("div");

    await api.load(target);
    expect(target.dataset.paideiaContainer).toBe("double-and-triple-integrals");
    expect(api.saveState()).toEqual({ predictionCommitted: false });
    expect(api.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    api.resume({ predictionCommitted: true });
    api.syncTheme({ colorScheme: "dark", accentColor: "#0891b2" });
    expect(target.dataset.paideiaTheme).toBe("dark");
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    api.destroy();
    expect(target.dataset.paideiaContainer).toBeUndefined();
    expect(api.score().completed).toBe(false);
  });
});
