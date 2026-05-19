// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  approxEqual,
  degrees,
  kilograms,
  metres,
  metresPerSecond,
  newtons,
  seconds,
} from "@paideia/shared";
import { momentumModel } from "./momentum.js";
import { runMomentumGateContract } from "./momentum.contract.js";

describe("momentum sim", () => {
  it("computes positive work, kinetic energy change, and average power through core mechanics", () => {
    const model = momentumModel({
      forceNewtons: newtons(10),
      displacementMetres: metres(3),
      angleDegrees: degrees(0),
      elapsedSeconds: seconds(2),
      massKilograms: kilograms(4),
      initialSpeedMetresPerSecond: metresPerSecond(1),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.workJoules, 30)).toBe(true);
    expect(approxEqual(model.value.initialKineticEnergyJoules, 2)).toBe(true);
    expect(approxEqual(model.value.finalKineticEnergyJoules, 32)).toBe(true);
    expect(approxEqual(model.value.averagePowerWatts, 15)).toBe(true);
    expect(model.value.signDecision).toBe("positive");
    expect(model.value.trace).toHaveLength(25);
  });

  it("returns zero work for a force perpendicular to displacement", () => {
    const model = momentumModel({
      forceNewtons: newtons(12),
      displacementMetres: metres(5),
      angleDegrees: degrees(90),
      elapsedSeconds: seconds(4),
      massKilograms: kilograms(5),
      initialSpeedMetresPerSecond: metresPerSecond(2),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.workJoules, 0, 1e-9)).toBe(true);
    expect(approxEqual(model.value.averagePowerWatts, 0, 1e-9)).toBe(true);
    expect(model.value.signDecision).toBe("zero");
  });

  it("shows braking as negative work and clamps the kinetic store at zero", () => {
    const model = momentumModel({
      forceNewtons: newtons(8),
      displacementMetres: metres(3),
      angleDegrees: degrees(180),
      elapsedSeconds: seconds(3),
      massKilograms: kilograms(2),
      initialSpeedMetresPerSecond: metresPerSecond(2),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.workJoules, -24)).toBe(true);
    expect(approxEqual(model.value.finalKineticEnergyJoules, 0)).toBe(true);
    expect(approxEqual(model.value.energyChangeJoules, -4)).toBe(true);
    expect(model.value.signDecision).toBe("negative");
  });

  it("rejects invalid elapsed time through the KernelResult error contract", () => {
    const model = momentumModel({
      forceNewtons: newtons(10),
      displacementMetres: metres(3),
      angleDegrees: degrees(0),
      elapsedSeconds: seconds(0),
      massKilograms: kilograms(4),
      initialSpeedMetresPerSecond: metresPerSecond(1),
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });
});

runMomentumGateContract();
