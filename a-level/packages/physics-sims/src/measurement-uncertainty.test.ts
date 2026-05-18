// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { measurementModel } from "./measurement-uncertainty.js";
import { runMeasurementUncertaintyGateContract } from "./measurement-uncertainty.contract.js";

describe("measurement-uncertainty lab", () => {
  it("computes speed and division uncertainty", () => {
    const model = measurementModel({
      distanceMetres: 2,
      distanceUncertaintyMetres: 0.02,
      timeSeconds: 0.8,
      timeUncertaintySeconds: 0.02,
    });

    expect(model.speedMetresPerSecond).toBeCloseTo(2.5);
    expect(model.combinedRelativeUncertainty).toBeCloseTo(0.035);
    expect(model.speedUncertaintyMetresPerSecond).toBeCloseTo(0.0875);
    expect(model.validEquationUnit).toBe("m s^-1");
  });
});

runMeasurementUncertaintyGateContract();
