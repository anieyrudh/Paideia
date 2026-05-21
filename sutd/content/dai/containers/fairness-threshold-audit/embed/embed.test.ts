// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("fairness-threshold-audit embed API", () => {
  it("loads, saves, resumes, scores, syncs theme, and destroys without aliasing state", async () => {
    const host = document.createElement("section");
    const embed = createContainerEmbed();

    await embed.load(host);

    const initial = embed.saveState();
    expect(initial.predictionCommitted).toBe(false);
    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });

    embed.resume({ predictionCommitted: true });
    const committed = embed.saveState();
    expect(committed.predictionCommitted).toBe(true);
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    embed.resume({ predictionCommitted: false });
    const saved = embed.saveState();
    embed.resume({ predictionCommitted: true });
    expect(saved.predictionCommitted).toBe(false);
    expect(embed.score().score).toBe(1);

    embed.syncTheme({ colorScheme: "dark", accentColor: "#1f5f8b" });
    expect(host.getAttribute("data-paideia-theme")).toBe("dark");
    embed.syncTheme(null);
    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
    embed.syncTheme({ colorScheme: "light" });
    expect(host.getAttribute("data-paideia-theme")).toBe("light");
    embed.syncTheme(undefined);
    expect(host.hasAttribute("data-paideia-theme")).toBe(false);

    embed.resume({ predictionCommitted: true });
    embed.syncTheme({ colorScheme: "dark" });
    embed.destroy();

    expect(embed.saveState()).toEqual({ predictionCommitted: false });
    expect(embed.score().score).toBe(0);
    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
  });
});
