// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("magnetic induction embed contract", () => {
  it("round-trips prediction state and score through zod schemas", async () => {
    const embed = createContainerEmbed();
    const target = document.createElement("section");

    await embed.load(target);

    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });

    embed.resume({ predictionCommitted: true });

    expect(embed.saveState()).toEqual({ predictionCommitted: true });
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    embed.destroy();

    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });

  it("moves theme attributes when retargeted and clears stale accent colors", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("article");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#0f766e" });

    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent-color")).toBe("#0f766e");

    await embed.load(secondTarget);

    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-accent-color")).toBe(false);
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(secondTarget.getAttribute("data-paideia-accent-color")).toBe("#0f766e");

    embed.syncTheme({ colorScheme: "light" });

    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent-color")).toBe(false);

    embed.destroy();

    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-accent-color")).toBe(false);
  });
});
