// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createPhysicalQuantitiesEmbed } from "./index.js";

describe("physical-quantities-and-units embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createPhysicalQuantitiesEmbed();
    const target = document.createElement("section");

    await embed.load(target);
    expect(target.getAttribute("data-paideia-container")).toBe("physical-quantities-and-units");
    expect(embed.saveState()).toEqual({
      selectedExample: "acceleration-unit-check",
      completed: false,
    });
    expect(embed.score()).toEqual({ completed: false, score: 0 });

    const resumedState = {
      selectedExample: "speed-record",
      completed: true,
    };
    embed.resume(resumedState);
    resumedState.completed = false;
    expect(embed.score()).toEqual({ completed: true, score: 1 });

    const savedState = embed.saveState();
    Reflect.set(savedState, "completed", false);
    expect(embed.score()).toEqual({ completed: true, score: 1 });

    embed.syncTheme({ colorScheme: "dark" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();

    embed.destroy();
    expect(target.hasAttribute("data-paideia-container")).toBe(false);
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      selectedExample: "acceleration-unit-check",
      completed: false,
    });
  });
});
