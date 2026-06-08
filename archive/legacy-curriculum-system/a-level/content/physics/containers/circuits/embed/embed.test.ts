// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("circuits embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);

    const resumedState = {
      branchAResistanceOhms: 30,
      branchBResistanceOhms: 60,
      predictionCommitted: true,
      seriesResistanceOhms: 10,
      supplyVoltageVolts: 6,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      branchAResistanceOhms: 30,
      branchBResistanceOhms: 60,
      predictionCommitted: true,
      seriesResistanceOhms: 10,
      supplyVoltageVolts: 6,
    });
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    const saved = embed.saveState();
    Reflect.set(saved, "predictionCommitted", false);
    expect(embed.saveState().predictionCommitted).toBe(true);

    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(() => embed.syncTheme({ colorScheme: "sepia" } as never)).toThrow();

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      branchAResistanceOhms: 40,
      branchBResistanceOhms: 60,
      predictionCommitted: false,
      seriesResistanceOhms: 20,
      supplyVoltageVolts: 9,
    });
  });
});
