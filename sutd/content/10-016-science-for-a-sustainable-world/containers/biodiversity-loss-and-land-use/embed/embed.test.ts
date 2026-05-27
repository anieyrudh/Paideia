import { describe, expect, it } from "vitest";

import { createBiodiversityLossAndLandUseEmbed } from "./index";

describe("biodiversity embed api", () => {
  it("scores net conversion pressure", () => {
    const embed = createBiodiversityLossAndLandUseEmbed();
    embed.load({
      conversionPercentPerYear: 6,
      restorationPercentPerYear: 0,
      sensitivity: 1.4,
      predictionCommitted: true,
    });
    expect(embed.score()).toMatchObject({
      complete: true,
      netConversionPercentPerYear: 6,
      risk: "high",
    });
  });

  it("clamps resumed sensitivity", () => {
    const embed = createBiodiversityLossAndLandUseEmbed();
    expect(embed.resume({ sensitivity: 5 }).sensitivity).toBe(2.2);
  });
});
