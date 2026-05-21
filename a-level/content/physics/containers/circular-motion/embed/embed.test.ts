// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createCircularMotionEmbed } from "./index.js";

describe("circular motion embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createCircularMotionEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("circular-motion");
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    const resumedState = { ...embed.saveState(), predictionCommitted: true };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    embed.syncTheme({ colorScheme: "dark", accentColor: "#c2410c" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });

  it("rejects non-positive radius on resume", () => {
    const embed = createCircularMotionEmbed();
    const state = { ...embed.saveState(), radiusMetres: 0 };

    expect(() => embed.resume(state)).toThrow();
  });
});
