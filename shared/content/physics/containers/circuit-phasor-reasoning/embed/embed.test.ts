// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("circuit phasor embed contract", () => {
  it("validates host state, clones snapshots, and scores completion", async () => {
    const embed = createContainerEmbed();
    const target = document.createElement("section");

    await embed.load(target);
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
  });

  it("validates and cleans up theme sync", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#0ea5e9" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#0ea5e9");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);
    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });

  it("rejects invalid host-provided state and theme values", () => {
    const embed = createContainerEmbed();

    expect(() => embed.resume({ predictionCommitted: "yes" } as never)).toThrow();
    expect(() => embed.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
