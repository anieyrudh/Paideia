// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createContainerEmbed } from "./index.js";

describe("gauss law embed API", () => {
  it("loads into a host element and synchronises theme attributes", async () => {
    const host = document.createElement("section");
    const embed = createContainerEmbed();

    await embed.load(host);
    embed.syncTheme({ colorScheme: "dark" });

    expect(host.getAttribute("data-paideia-theme")).toBe("dark");
  });

  it("saves and resumes state with defensive copies", async () => {
    const host = document.createElement("section");
    const embed = createContainerEmbed();

    await embed.load(host);
    const nextState = { predictionCommitted: true };
    embed.resume(nextState);
    nextState.predictionCommitted = false;

    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });
    const saved = embed.saveState();
    expect(saved).toEqual({ predictionCommitted: true });
    expect(embed.saveState()).not.toBe(saved);
  });

  it("destroys host bindings and resets state", async () => {
    const host = document.createElement("section");
    const embed = createContainerEmbed();

    await embed.load(host);
    embed.syncTheme({ colorScheme: "light" });
    embed.resume({ predictionCommitted: true });
    embed.destroy();

    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({ predictionCommitted: false });
    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });
  });
});
