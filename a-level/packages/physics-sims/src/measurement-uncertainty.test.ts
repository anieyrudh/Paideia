// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { calculateMeasurementModel } from "./measurement-uncertainty.js";
import { runMeasurementUncertaintyGateContract } from "./measurement-uncertainty.contract.js";

describe("measurement-uncertainty lab", () => {
  it("calculates best estimate, uncertainty, and derived speed", () => {
    const model = calculateMeasurementModel({
      firstReadingCm: 12.4,
      secondReadingCm: 12.8,
      rulerDivisionCm: 0.1,
      timeS: 2.5,
    });

    expect(model.meanLengthCm).toBeCloseTo(12.6, 12);
    expect(model.repeatUncertaintyCm).toBeCloseTo(0.2, 12);
    expect(model.instrumentUncertaintyCm).toBeCloseTo(0.05, 12);
    expect(model.absoluteUncertaintyCm).toBeCloseTo(0.2, 12);
    expect(model.speedCmPerS).toBeCloseTo(5.04, 12);
    expect(model.speedMPerS).toBeCloseTo(0.0504, 12);
  });
});

runMeasurementUncertaintyGateContract();
