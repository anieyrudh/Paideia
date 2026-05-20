// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createScalarsVectorsEmbed } from "./index.js";

describe("scalars-and-vectors embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createScalarsVectorsEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("scalars-and-vectors");
    expect(embed.saveState()).toEqual({
      vectorA: 5,
      vectorB: 5,
      angleDegrees: 90,
      predictionCommitted: false,
    });
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    const resumedState = {
      vectorA: 3,
      vectorB: 4,
      angleDegrees: 90,
      predictionCommitted: true,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    const savedState = embed.saveState();
    Reflect.set(savedState, "predictionCommitted", false);
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    embed.syncTheme({ colorScheme: "dark", accentColor: "#1f5f8b" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });
});
