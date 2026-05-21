// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("hypothesis testing embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#2563eb");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);

    const resumedState = {
      alpha: 0.01,
      nullMean: 70,
      observedMean: 66.7,
      populationStandardDeviation: 9,
      predictionCommitted: true,
      sampleSize: 49,
      tail: "two-sided" as const,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      alpha: 0.01,
      nullMean: 70,
      observedMean: 66.7,
      populationStandardDeviation: 9,
      predictionCommitted: true,
      sampleSize: 49,
      tail: "two-sided",
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
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      alpha: 0.05,
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      predictionCommitted: false,
      sampleSize: 36,
      tail: "greater",
    });
  });

  it("validates host-provided state and theme at the embed boundary", () => {
    const embed = createContainerEmbed();

    expect(() =>
      embed.resume({
        predictionCommitted: true,
        sampleSize: 12,
      }),
    ).toThrow();

    expect(() =>
      embed.syncTheme({
        colorScheme: "light",
        accentColor: "",
      }),
    ).toThrow();
  });
});
