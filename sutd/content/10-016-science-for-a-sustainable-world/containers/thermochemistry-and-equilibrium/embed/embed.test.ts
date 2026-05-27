// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createEmbedApi } from "./index.js";

describe("thermochemistry-and-equilibrium embed contract", () => {
  it("exposes load, saveState, score, resume, syncTheme, and destroy", async () => {
    const api = createEmbedApi();
    await api.load(document.createElement("div"));

    expect(api.saveState()).toEqual({ predictionCommitted: false });
    api.resume({ predictionCommitted: true });
    expect(api.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });
    api.syncTheme({ colorScheme: "dark" });
    api.destroy();
    expect(api.saveState()).toEqual({ predictionCommitted: false });
  });
});
