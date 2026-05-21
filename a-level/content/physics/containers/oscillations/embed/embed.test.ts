import { describe, expect, it } from "vitest";
import { createOscillationsEmbed } from "./index.js";

describe("oscillations embed contract", () => {
  it("implements load, saveState, score, resume, syncTheme, and destroy", async () => {
    const embed = createOscillationsEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("oscillations");
    expect(embed.saveState().predictionCommitted).toBe(false);
    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });

    embed.resume({
      massKilograms: 2,
      springConstantNewtonsPerMetre: 64,
      amplitudeMetres: 1.6,
      phaseRadians: 0,
      timeSeconds: 0,
      predictionCommitted: true,
    });
    expect(embed.saveState().springConstantNewtonsPerMetre).toBe(64);
    expect(embed.score().score).toBe(1);

    embed.syncTheme({ colorScheme: "dark" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });
});
