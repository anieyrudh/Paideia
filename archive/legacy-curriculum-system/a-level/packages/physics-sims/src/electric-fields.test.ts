// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  electricFieldsModel,
  electricFieldVectorAt,
  type ElectricFieldsState,
} from "./electric-fields.js";
import { runElectricFieldsGateContract } from "./electric-fields.contract.js";

const finiteChargeMicroC = fc.double({
  min: 0.1,
  max: 1,
  noDefaultInfinity: true,
  noNaN: true,
});
const finiteTestChargeNanoC = fc.double({
  min: -30,
  max: 30,
  noDefaultInfinity: true,
  noNaN: true,
});
const finiteSeparationCm = fc.double({
  min: 5,
  max: 25,
  noDefaultInfinity: true,
  noNaN: true,
});

const state = (input: {
  readonly angleDegrees: number;
  readonly separationCm: number;
  readonly sourceChargeMicroC: number;
  readonly testChargeNanoC: number;
}): ElectricFieldsState => input as ElectricFieldsState;

describe("electric fields sim", () => {
  it("computes point-charge field, force, potential, and energy with units", () => {
    const model = electricFieldsModel(state({
      angleDegrees: 0,
      separationCm: 15,
      sourceChargeMicroC: 0.5,
      testChargeNanoC: -20,
    }));

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.electricFieldStrengthNPerC, 199777.77777777775, 1e-9)).toBe(true);
    expect(approxEqual(model.value.forceMagnitudeNewtons, 0.003995555555555555, 1e-9)).toBe(true);
    expect(approxEqual(model.value.potentialVolts, 29966.666666666668, 1e-9)).toBe(true);
    expect(approxEqual(model.value.potentialEnergyJoules, -0.0005993333333333334, 1e-9)).toBe(true);
  });

  it("reverses electric field direction when the source charge sign changes", () => {
    const point = [0.1, 0] as const;
    const positive = electricFieldVectorAt(0.5e-6, point);
    const negative = electricFieldVectorAt(-0.5e-6, point);

    expect(positive.ok).toBe(true);
    expect(negative.ok).toBe(true);
    if (!positive.ok || !negative.ok) throw new Error("Expected valid field vectors.");
    expect(positive.value[0]).toBeGreaterThan(0);
    expect(negative.value[0]).toBeLessThan(0);
    expect(approxEqual(Math.abs(positive.value[0]), Math.abs(negative.value[0]), 1e-9)).toBe(true);
  });

  it("makes force reverse with test charge sign while field is unchanged", () => {
    const positiveTest = electricFieldsModel(state({
      angleDegrees: 0,
      separationCm: 15,
      sourceChargeMicroC: 0.5,
      testChargeNanoC: 20,
    }));
    const negativeTest = electricFieldsModel(state({
      angleDegrees: 0,
      separationCm: 15,
      sourceChargeMicroC: 0.5,
      testChargeNanoC: -20,
    }));

    expect(positiveTest.ok).toBe(true);
    expect(negativeTest.ok).toBe(true);
    if (!positiveTest.ok || !negativeTest.ok) throw new Error("Expected valid field models.");
    expect(
      approxEqual(
        positiveTest.value.electricFieldStrengthNPerC,
        negativeTest.value.electricFieldStrengthNPerC,
        1e-9,
      ),
    ).toBe(true);
    expect(positiveTest.value.forceVectorNewtons[0]).toBeGreaterThan(0);
    expect(negativeTest.value.forceVectorNewtons[0]).toBeLessThan(0);
  });

  it("obeys inverse-square scaling over valid separations", () => {
    fc.assert(
      fc.property(
        finiteChargeMicroC,
        finiteTestChargeNanoC,
        finiteSeparationCm,
        finiteSeparationCm,
        (sourceChargeMicroC, testChargeNanoC, separationA, separationB) => {
          fc.pre(Math.abs(separationA - separationB) > 0.5);
          const modelA = electricFieldsModel(state({
            angleDegrees: 30,
            separationCm: separationA,
            sourceChargeMicroC,
            testChargeNanoC,
          }));
          const modelB = electricFieldsModel(state({
            angleDegrees: 30,
            separationCm: separationB,
            sourceChargeMicroC,
            testChargeNanoC,
          }));

          expect(modelA.ok).toBe(true);
          expect(modelB.ok).toBe(true);
          if (!modelA.ok || !modelB.ok) return;
          const ratio =
            modelA.value.electricFieldStrengthNPerC /
            modelB.value.electricFieldStrengthNPerC;
          const expectedRatio = (separationB / separationA) ** 2;
          expect(approxEqual(ratio, expectedRatio, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runElectricFieldsGateContract();
