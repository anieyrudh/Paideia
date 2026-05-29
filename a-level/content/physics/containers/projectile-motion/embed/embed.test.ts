// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createProjectileMotionEmbed } from "./index.js";

describe("projectile-motion embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createProjectileMotionEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("projectile-motion");
    expect(embed.saveState()).toEqual({
      launchSpeedMetresPerSecond: 18,
      launchAngleDegrees: 35,
      launchHeightMetres: 2,
      predictionCommitted: false,
    });
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    const resumedState = {
      launchSpeedMetresPerSecond: 20,
      launchAngleDegrees: 45,
      launchHeightMetres: 3,
      predictionCommitted: true,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    const savedState = embed.saveState();
    Reflect.set(savedState, "predictionCommitted", false);
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    embed.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();
    expect(() => embed.resume({ ...resumedState, launchAngleDegrees: 90 })).toThrow();

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });
});
