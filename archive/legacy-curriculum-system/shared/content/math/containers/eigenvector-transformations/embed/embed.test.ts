// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("eigenvector transformations embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#3b82f6" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#3b82f6");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);

    const resumedState = { predictionCommitted: true };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({ predictionCommitted: true });
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    const saved = embed.saveState();
    Reflect.set(saved, "predictionCommitted", false);
    expect(embed.saveState()).toEqual({ predictionCommitted: true });

    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);
    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });

  it("keeps theme ownership scoped to the loaded target", async () => {
    const embed = createContainerEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#f97316" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(target.getAttribute("data-paideia-accent")).toBe("#f97316");

    embed.destroy();

    expect(() => embed.syncTheme({ colorScheme: "light", accentColor: "#22c55e" })).not.toThrow();
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
    expect(target.hasAttribute("data-paideia-accent")).toBe(false);
    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });
  });

  it("rejects invalid host-provided state and theme values", () => {
    const embed = createContainerEmbed();

    expect(() => embed.resume({ predictionCommitted: "yes" } as never)).toThrow();
    expect(() => embed.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
