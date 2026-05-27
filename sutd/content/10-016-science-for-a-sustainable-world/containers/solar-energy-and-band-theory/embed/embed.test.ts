import { describe, expect, it } from "vitest";

import { createSolarEnergyAndBandTheoryEmbed } from "./index";

describe("solar energy and band theory embed api", () => {
  it("normalises state and scores absorption", () => {
    const embed = createSolarEnergyAndBandTheoryEmbed();

    const state = embed.load({
      wavelengthNanometres: 500,
      bandGapElectronVolts: 1.1,
      irradianceWattsPerSquareMetre: 900,
      predictionCommitted: true,
    });

    expect(state.wavelengthNanometres).toBe(500);
    expect(embed.score()).toMatchObject({
      complete: true,
      absorbed: true,
    });
    expect(embed.score().photonEnergyElectronVolts).toBeCloseTo(2.48, 2);
  });

  it("resumes partial state inside allowed bounds", () => {
    const embed = createSolarEnergyAndBandTheoryEmbed();
    embed.load();
    const resumed = embed.resume({ wavelengthNanometres: 2000 });

    expect(resumed.wavelengthNanometres).toBe(1100);
  });
});
