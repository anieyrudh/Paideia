import { describe, expect, it } from "vitest";
import { linearRegressionModel } from "./linear-regression.js";

describe("linearRegressionModel", () => {
  it("fits a positive least-squares slope for the default sensor data", () => {
    const model = linearRegressionModel({});
    expect(model.ok).toBe(true);
    if (!model.ok) return;

    expect(model.value.slope).toBeGreaterThan(0.9);
    expect(model.value.slope).toBeLessThan(1.1);
    expect(model.value.r2).toBeGreaterThan(0.99);
  });

  it("responds to a high-leverage upward shift", () => {
    const base = linearRegressionModel({ dataset: "sensor", outlierShift: 0, noiseLevel: 0 });
    const shifted = linearRegressionModel({ dataset: "sensor", outlierShift: 10, noiseLevel: 0 });
    expect(base.ok).toBe(true);
    expect(shifted.ok).toBe(true);
    if (!base.ok || !shifted.ok) return;

    expect(shifted.value.slope).toBeGreaterThan(base.value.slope);
    expect(shifted.value.residuals).toHaveLength(base.value.points.length);
  });

  it("keeps residuals centred near zero", () => {
    const model = linearRegressionModel({ dataset: "delivery", outlierShift: 5, noiseLevel: 4 });
    expect(model.ok).toBe(true);
    if (!model.ok) return;

    const residualSum = model.value.residuals.reduce((sum, residual) => sum + residual, 0);
    expect(Math.abs(residualSum)).toBeLessThan(1e-8);
  });
});
