// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("signal filter frequency response embed API", () => {
  it("loads into a host element and syncs theme state", async () => {
    const host = document.createElement("div");
    const embed = createContainerEmbed();

    await embed.load(host);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });

    expect(host.getAttribute("data-paideia-theme")).toBe("dark");
    expect(host.getAttribute("data-paideia-accent")).toBe("#2563eb");

    embed.destroy();

    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
    expect(host.hasAttribute("data-paideia-accent")).toBe(false);
  });

  it("saves, resumes, scores, and resets the embed state", () => {
    const embed = createContainerEmbed();

    expect(embed.saveState()).toEqual({ predictionCommitted: false });
    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });

    embed.resume({ predictionCommitted: true });

    expect(embed.saveState()).toEqual({ predictionCommitted: true });
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    embed.destroy();

    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });
});
