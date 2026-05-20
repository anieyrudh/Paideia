// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createMomentumEmbed } from "./index.js";

describe("momentum embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createMomentumEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("momentum");
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    const resumedState = { ...embed.saveState(), predictionCommitted: true };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    embed.syncTheme({ colorScheme: "dark", accentColor: "#1f5f8b" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });
});
