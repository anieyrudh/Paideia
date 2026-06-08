// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("confidence intervals embed contract", () => {
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
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);

    const resumedState = {
      sampleMean: 72.4,
      populationStandardDeviation: 11.2,
      predictionCommitted: true,
      sampleSize: 64,
      confidenceLevel: 0.95 as const,
      comparisonMean: 70,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      sampleMean: 72.4,
      populationStandardDeviation: 11.2,
      predictionCommitted: true,
      sampleSize: 64,
      confidenceLevel: 0.95,
      comparisonMean: 70,
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
      sampleMean: 68,
      populationStandardDeviation: 9,
      predictionCommitted: false,
      sampleSize: 36,
      confidenceLevel: 0.95,
      comparisonMean: 65,
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
