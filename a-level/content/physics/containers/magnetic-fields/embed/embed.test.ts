// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("magnetic fields embed contract", () => {
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
      activeLengthCm: 10,
      angleDegrees: 90,
      currentAmperes: 8,
      fieldMilliTesla: 80,
      particleChargeMicroC: -3,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1.4,
      predictionCommitted: true,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      activeLengthCm: 10,
      angleDegrees: 90,
      currentAmperes: 8,
      fieldMilliTesla: 80,
      particleChargeMicroC: -3,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1.4,
      predictionCommitted: true,
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
    expect(() => embed.resume({ ...resumedState, activeLengthCm: 0 })).toThrow();

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      activeLengthCm: 8,
      angleDegrees: 90,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: 2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
      predictionCommitted: false,
    });
  });
});
