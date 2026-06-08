// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createEmbed } from "./index.js";

describe("shading daylight heat gain embed contract", () => {
  it("exposes load, state, score, resume, theme sync, and destroy", async () => {
    const api = createEmbed();
    const target = document.createElement("div");

    await api.load(target);
    expect(target.dataset.paideiaContainer).toBe("shading-daylight-heat-gain");
    expect(api.saveState()).toEqual({ predictionCommitted: false });
    expect(api.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    api.resume({ predictionCommitted: true });
    api.syncTheme({ colorScheme: "light" });
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    api.destroy();
    expect(api.score().completed).toBe(false);
  });
});
