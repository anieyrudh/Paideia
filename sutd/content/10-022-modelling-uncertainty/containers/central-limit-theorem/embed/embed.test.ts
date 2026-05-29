// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createCentralLimitTheoremEmbed } from "./index.js";

describe("central limit theorem embed contract", () => {
  it("validates host state, clones snapshots, and scores completion", async () => {
    const embed = createCentralLimitTheoremEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    const resumedState = {
      predictionCommitted: true,
      population: "uniform" as const,
      sampleSize: 16,
      sampleCount: 160,
      seed: 29,
    };
    embed.resume(resumedState);
    resumedState.sampleSize = 64;

    expect(embed.saveState()).toEqual({
      predictionCommitted: true,
      population: "uniform",
      sampleSize: 16,
      sampleCount: 160,
      seed: 29,
    });
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    const saved = embed.saveState();
    Reflect.set(saved, "predictionCommitted", false);
    expect(embed.saveState()).toMatchObject({ predictionCommitted: true });
  });

  it("validates and cleans up theme sync", async () => {
    const embed = createCentralLimitTheoremEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#6941c6" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#6941c6");

    embed.syncTheme({ colorScheme: "dark" });
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);

    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);
    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });

  it("rejects invalid host-provided state and theme values", () => {
    const embed = createCentralLimitTheoremEmbed();

    expect(() => embed.resume({ predictionCommitted: "yes" } as never)).toThrow();
    expect(() => embed.resume({ predictionCommitted: true, sampleSize: 0 } as never)).toThrow();
    expect(() => embed.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
