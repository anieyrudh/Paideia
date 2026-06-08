// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createKinematicsEmbed } from "./index.js";

describe("kinematics-in-one-dimension embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createKinematicsEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("kinematics-in-one-dimension");
    expect(embed.saveState()).toEqual({
      initialVelocityMetresPerSecond: 0,
      accelerationMetresPerSecondSquared: 2,
      elapsedSeconds: 3,
      predictionCommitted: false,
    });
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    const resumedState = {
      initialVelocityMetresPerSecond: 4,
      accelerationMetresPerSecondSquared: 1,
      elapsedSeconds: 4,
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
