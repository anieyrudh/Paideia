// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual, metres, seconds } from "@paideia/shared";
import { measurementModel } from "./measurement-uncertainty.js";
import { runMeasurementUncertaintyGateContract } from "./measurement-uncertainty.contract.js";

describe("measurement-uncertainty lab", () => {
  it("computes speed and division uncertainty", () => {
    const model = measurementModel({
      distanceMetres: metres(2),
      distanceUncertaintyMetres: metres(0.02),
      timeSeconds: seconds(0.8),
      timeUncertaintySeconds: seconds(0.02),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.speedMetresPerSecond, 2.5)).toBe(true);
    expect(approxEqual(model.value.combinedRelativeUncertainty, 0.035)).toBe(true);
    expect(approxEqual(model.value.speedUncertaintyMetresPerSecond, 0.0875)).toBe(true);
    expect(model.value.validEquationUnit).toBe("m s^-1");
  });

  it("rejects non-positive distance and time inputs", () => {
    const invalidDistance = measurementModel({
      distanceMetres: metres(0),
      distanceUncertaintyMetres: metres(0.02),
      timeSeconds: seconds(0.8),
      timeUncertaintySeconds: seconds(0.02),
    });
    const invalidTime = measurementModel({
      distanceMetres: metres(2),
      distanceUncertaintyMetres: metres(0.02),
      timeSeconds: seconds(0),
      timeUncertaintySeconds: seconds(0.02),
    });

    expect(invalidDistance.ok).toBe(false);
    expect(invalidTime.ok).toBe(false);
  });
});

runMeasurementUncertaintyGateContract();
