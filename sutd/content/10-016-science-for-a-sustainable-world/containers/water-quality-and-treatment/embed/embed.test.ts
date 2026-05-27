import { describe, expect, it } from "vitest";

import { createWaterQualityAndTreatmentEmbed } from "./index";

describe("water quality and treatment embed api", () => {
  it("scores finished turbidity and CT", () => {
    const embed = createWaterQualityAndTreatmentEmbed();
    embed.load({
      rawTurbidityNtu: 100,
      filterRemovalPercent: 95,
      chlorineMgPerLitre: 2,
      contactMinutes: 70,
      pH: 7,
      predictionCommitted: true,
    });

    expect(embed.score()).toMatchObject({
      complete: true,
      finishedTurbidityNtu: 5,
      ctMgMinutesPerLitre: 140,
      meetsScreen: true,
    });
  });

  it("clamps resumed state", () => {
    const embed = createWaterQualityAndTreatmentEmbed();
    const resumed = embed.resume({ pH: 12 });

    expect(resumed.pH).toBe(10);
  });
});
