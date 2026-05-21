// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("electric fields embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);

    const resumedState = {
      angleDegrees: 45,
      predictionCommitted: true,
      separationCm: 12,
      sourceChargeMicroC: -0.6,
      testChargeNanoC: 15,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      angleDegrees: 45,
      predictionCommitted: true,
      separationCm: 12,
      sourceChargeMicroC: -0.6,
      testChargeNanoC: 15,
    });
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    const saved = embed.saveState();
    Reflect.set(saved, "predictionCommitted", false);
    expect(embed.saveState().predictionCommitted).toBe(true);

    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();
    expect(() => embed.resume({ ...resumedState, separationCm: 0 })).toThrow();

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      angleDegrees: 0,
      predictionCommitted: false,
      separationCm: 15,
      sourceChargeMicroC: 0.5,
      testChargeNanoC: -20,
    });
  });
});
