// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("capacitance embed contract", () => {
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
      capacitanceMicrofarads: 680,
      dischargeResistanceKilohms: 15,
      predictionCommitted: true,
      sampleTimeMilliseconds: 3000,
      supplyVoltageVolts: 8,
    };
    embed.resume(resumedState);
    resumedState.predictionCommitted = false;

    expect(embed.saveState()).toEqual({
      capacitanceMicrofarads: 680,
      dischargeResistanceKilohms: 15,
      predictionCommitted: true,
      sampleTimeMilliseconds: 3000,
      supplyVoltageVolts: 8,
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
    expect(() => embed.resume({ ...resumedState, capacitanceMicrofarads: 0 })).toThrow();

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      capacitanceMicrofarads: 470,
      dischargeResistanceKilohms: 5,
      predictionCommitted: false,
      sampleTimeMilliseconds: 1500,
      supplyVoltageVolts: 6,
    });
  });
});
