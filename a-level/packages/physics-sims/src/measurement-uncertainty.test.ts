// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { defaultMeasurementState, measurementModel } from "./measurement-uncertainty.js";
import { runMeasurementUncertaintyGateContract } from "./measurement-uncertainty.contract.js";

describe("measurement-uncertainty sim", () => {
  it("converts readings to SI units and propagates division uncertainty", () => {
    const model = measurementModel(defaultMeasurementState);

    expect(model.distanceMetres).toBeCloseTo(0.8, 12);
    expect(model.distanceUncertaintyMetres).toBeCloseTo(0.005, 12);
    expect(model.speedMetresPerSecond).toBeCloseTo(0.4, 12);
    expect(model.speedRelativeUncertaintyPercent).toBeCloseTo(5.625, 12);
    expect(model.speedUncertaintyMetresPerSecond).toBeCloseTo(0.0225, 12);
  });

  it("marks unlike base dimensions as impossible to add", () => {
    const invalidCheck = measurementModel(defaultMeasurementState).equationChecks.find(
      (check) => check.equation === "distance + time",
    );

    expect(invalidCheck?.valid).toBe(false);
    expect(invalidCheck?.reason).toContain("cannot be added");
  });
});

runMeasurementUncertaintyGateContract();
