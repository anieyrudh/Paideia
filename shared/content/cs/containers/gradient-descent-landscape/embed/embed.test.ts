// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("gradient descent embed contract", () => {
  it("exposes lifecycle methods and round-trips learner state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    expect(embed.load).toBeTypeOf("function");
    expect(embed.saveState).toBeTypeOf("function");
    expect(embed.score).toBeTypeOf("function");
    expect(embed.resume).toBeTypeOf("function");
    expect(embed.syncTheme).toBeTypeOf("function");
    expect(embed.destroy).toBeTypeOf("function");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#7c3aed" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#7c3aed");

    embed.resume({
      predictionCommitted: true,
      landscape: "bowl",
      startX: 3.2,
      startY: 2.4,
      learningRate: 0.18,
      maxSteps: 40,
    });
    const saved = embed.saveState();
    expect(saved).toEqual({
      predictionCommitted: true,
      landscape: "bowl",
      startX: 3.2,
      startY: 2.4,
      learningRate: 0.18,
      maxSteps: 40,
    });
    Reflect.set(saved, "learningRate", 0.75);
    expect(embed.saveState().learningRate).toBe(0.18);
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);
    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      predictionCommitted: false,
      landscape: "ravine",
      startX: -3,
      startY: -2.4,
      learningRate: 0.22,
      maxSteps: 24,
    });
  });

  it("rejects invalid host-provided state and theme values", () => {
    const embed = createContainerEmbed();

    expect(() =>
      embed.resume({
        predictionCommitted: true,
        landscape: "flat" as never,
        startX: 0,
        startY: 0,
        learningRate: 0.2,
        maxSteps: 10,
      }),
    ).toThrow();
    expect(() =>
      embed.resume({
        predictionCommitted: true,
        landscape: "ravine",
        startX: 0,
        startY: 0,
        learningRate: 0,
        maxSteps: 10,
      }),
    ).toThrow();
    expect(() => embed.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
