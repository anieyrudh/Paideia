// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("bayes-updating embed contract", () => {
  it("exposes lifecycle methods and keeps state copies isolated", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("div");
    const secondTarget = document.createElement("div");

    expect(embed.load).toBeTypeOf("function");
    expect(embed.saveState).toBeTypeOf("function");
    expect(embed.score).toBeTypeOf("function");
    expect(embed.resume).toBeTypeOf("function");
    expect(embed.syncTheme).toBeTypeOf("function");
    expect(embed.destroy).toBeTypeOf("function");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#0f6b68" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);

    const savedBeforeResume = embed.saveState();
    savedBeforeResume.predictionCommitted = true;
    expect(embed.score().completed).toBe(false);

    embed.resume({ predictionCommitted: true });
    const savedAfterResume = embed.saveState();
    savedAfterResume.predictionCommitted = false;
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({ predictionCommitted: false });
  });
});
