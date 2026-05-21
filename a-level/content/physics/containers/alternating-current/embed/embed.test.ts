// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("alternating-current embed contract", () => {
  it("exposes lifecycle methods and isolates host state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-container")).toBe("alternating-current");

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.getAttribute("data-paideia-container")).toBe("alternating-current");

    const resumedState = {
      capacitanceMicroFarads: 220,
      frequencyHertz: 50,
      inductanceMilliHenrys: 260,
      predictionCommitted: true,
      resistanceOhms: 40,
      sampleTimeMilliseconds: 8,
      sourceVoltageRmsVolts: 12,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      capacitanceMicroFarads: 220,
      frequencyHertz: 50,
      inductanceMilliHenrys: 260,
      predictionCommitted: true,
      resistanceOhms: 40,
      sampleTimeMilliseconds: 8,
      sourceVoltageRmsVolts: 12,
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
    expect(() =>
      embed.resume({ ...resumedState, capacitanceMicroFarads: 5 }),
    ).toThrow();

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-container")).toBe(false);
    expect(embed.saveState()).toEqual({
      capacitanceMicroFarads: 120,
      frequencyHertz: 50,
      inductanceMilliHenrys: 180,
      predictionCommitted: false,
      resistanceOhms: 40,
      sampleTimeMilliseconds: 5,
      sourceVoltageRmsVolts: 12,
    });
  });
});
