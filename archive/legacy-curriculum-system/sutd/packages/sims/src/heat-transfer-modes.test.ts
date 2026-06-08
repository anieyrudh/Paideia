import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { heatTransferModesModel } from "./heat-transfer-modes.js";

describe("heat-transfer-modes model", () => {
  it("computes conduction, convection, and radiation from shared kernels", () => {
    const model = heatTransferModesModel({
      hotTemperatureCelsius: 75,
      coldTemperatureCelsius: 25,
      areaSquareMetres: 2,
      thicknessMetres: 0.16,
      conductivityWattsPerMetreKelvin: 0.8,
      convectionCoefficientWattsPerSquareMetreKelvin: 12,
      emissivity: 0.8,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.deltaTemperatureKelvins, 50)).toBe(true);
    expect(approxEqual(model.value.conductionWatts, 500)).toBe(true);
    expect(approxEqual(model.value.convectionWatts, 1200)).toBe(true);
    expect(model.value.radiationWatts).toBeGreaterThan(610);
    expect(model.value.radiationWatts).toBeLessThan(620);
    expect(model.value.dominantMode).toBe("convection");
  });

  it("reduces conduction when the wall is thicker", () => {
    const thin = heatTransferModesModel({ thicknessMetres: 0.08 });
    const thick = heatTransferModesModel({ thicknessMetres: 0.32 });

    expect(thin.ok).toBe(true);
    expect(thick.ok).toBe(true);
    if (!thin.ok) throw new Error(thin.error.message);
    if (!thick.ok) throw new Error(thick.error.message);
    expect(thin.value.conductionWatts).toBeGreaterThan(thick.value.conductionWatts);
    expect(thin.value.convectionWatts).toBe(thick.value.convectionWatts);
  });

  it("clamps ambient temperature below the hot surface before evaluating", () => {
    const model = heatTransferModesModel({
      hotTemperatureCelsius: 30,
      coldTemperatureCelsius: 35,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.deltaTemperatureKelvins).toBe(1);
  });
});
