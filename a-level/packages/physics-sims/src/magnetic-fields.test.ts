// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  magneticFieldsModel,
  type MagneticFieldsState,
} from "./magnetic-fields.js";
import { runMagneticFieldsGateContract } from "./magnetic-fields.contract.js";

const state = (input: {
  readonly activeLengthCm: number;
  readonly angleDegrees: number;
  readonly currentAmperes: number;
  readonly fieldMilliTesla: number;
  readonly particleChargeMicroC: number;
  readonly particleMassMilligrams: number;
  readonly particleSpeedKmPerSecond: number;
}): MagneticFieldsState => input as MagneticFieldsState;

describe("magnetic fields sim", () => {
  it("computes force on a current-carrying wire and a moving charge", () => {
    const model = magneticFieldsModel(state({
      activeLengthCm: 8,
      angleDegrees: 90,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: 2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
    }));

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.currentForceNewtons, 0.0192, 1e-9)).toBe(true);
    expect(approxEqual(model.value.chargeForceNewtons, 0.00008, 1e-9)).toBe(true);
    expect(model.value.forceDirection?.[1]).toBeGreaterThan(0);
    expect(model.value.chargeForceDirection?.[1]).toBeGreaterThan(0);
  });

  it("sets magnetic force to zero when current is parallel to the field", () => {
    const model = magneticFieldsModel(state({
      activeLengthCm: 8,
      angleDegrees: 0,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: 2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
    }));

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.currentForceNewtons).toBe(0);
    expect(model.value.chargeForceNewtons).toBe(0);
    expect(model.value.forceDirection).toBeNull();
  });

  it("reverses moving-charge force direction when charge sign changes", () => {
    const positive = magneticFieldsModel(state({
      activeLengthCm: 8,
      angleDegrees: 90,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: 2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
    }));
    const negative = magneticFieldsModel(state({
      activeLengthCm: 8,
      angleDegrees: 90,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: -2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
    }));

    expect(positive.ok).toBe(true);
    expect(negative.ok).toBe(true);
    if (!positive.ok || !negative.ok) throw new Error("Expected valid magnetic field models.");
    expect(positive.value.chargeForceDirection?.[1]).toBeGreaterThan(0);
    expect(negative.value.chargeForceDirection?.[1]).toBeLessThan(0);
    expect(
      approxEqual(positive.value.chargeForceNewtons, negative.value.chargeForceNewtons, 1e-9),
    ).toBe(true);
  });

  it("cross-checks perpendicular moving-charge force against circular motion", () => {
    const model = magneticFieldsModel(state({
      activeLengthCm: 8,
      angleDegrees: 90,
      currentAmperes: 6,
      fieldMilliTesla: 40,
      particleChargeMicroC: 2,
      particleMassMilligrams: 50,
      particleSpeedKmPerSecond: 1,
    }));

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.centripetalForceCheckNewtons).not.toBeNull();
    expect(
      approxEqual(
        model.value.centripetalForceCheckNewtons ?? 0,
        model.value.chargeForceNewtons,
        1e-9,
      ),
    ).toBe(true);
  });

  it("obeys BILsin(theta) scaling over valid learner-state inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 120, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 12, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 2, max: 20, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 90, noDefaultInfinity: true, noNaN: true }),
        (fieldMilliTesla, currentAmperes, activeLengthCm, angleDegrees) => {
          const model = magneticFieldsModel(state({
            activeLengthCm,
            angleDegrees,
            currentAmperes,
            fieldMilliTesla,
            particleChargeMicroC: 2,
            particleMassMilligrams: 50,
            particleSpeedKmPerSecond: 1,
          }));

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const expected =
            (fieldMilliTesla / 1000) *
            currentAmperes *
            (activeLengthCm / 100) *
            Math.sin((angleDegrees * Math.PI) / 180);

          expect(approxEqual(model.value.currentForceNewtons, expected, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521, numRuns: 100 },
    );
  });
});

runMagneticFieldsGateContract();
