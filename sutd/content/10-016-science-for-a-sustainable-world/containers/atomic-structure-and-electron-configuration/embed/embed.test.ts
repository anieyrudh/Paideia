// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createEmbedApi } from "./index.js";

describe("atomic-structure-and-electron-configuration embed contract", () => {
  it("exposes load, saveState, score, resume, syncTheme, and destroy", async () => {
    const api = createEmbedApi();
    const target = document.createElement("div");

    await api.load(target);
    expect(api.saveState()).toEqual({ predictionCommitted: false });
    expect(api.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });

    api.resume({ predictionCommitted: true });
    expect(api.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    api.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });
    api.destroy();
    expect(api.saveState()).toEqual({ predictionCommitted: false });
  });
});
