import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  coulombs,
  electricForceOnCharge,
  pointChargeElectricField,
  pointChargeModel,
} from "./index.js";

describe("point-charge electromagnetism", () => {
  it("computes electric field, force, potential, and potential energy", () => {
    const model = pointChargeModel({
      minRadiusMetres: 0.025,
      pointMetres: [0.15, 0],
      sourceChargeCoulombs: coulombs(0.5e-6),
      testChargeCoulombs: coulombs(-20e-9),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.electricFieldStrengthNewtonsPerCoulomb, 199777.77777777775, 1e-9)).toBe(true);
    expect(approxEqual(model.value.forceMagnitudeNewtons, 0.003995555555555555, 1e-9)).toBe(true);
    expect(approxEqual(model.value.potentialVolts, 29966.666666666668, 1e-9)).toBe(true);
    expect(approxEqual(model.value.potentialEnergyJoules, -0.0005993333333333334, 1e-9)).toBe(true);
  });

  it("returns undefined-at-point for an unclamped source point", () => {
    const field = pointChargeElectricField({
      pointMetres: [0, 0],
      sourceChargeCoulombs: coulombs(1e-6),
    });

    expect(field.ok).toBe(false);
    if (field.ok) throw new Error("Expected source point to be rejected.");
    expect(field.error.code).toBe("undefined-at-point");
  });

  it("returns zero field and potential for zero source charge at the source point", () => {
    const model = pointChargeModel({
      pointMetres: [0, 0],
      sourceChargeCoulombs: coulombs(0),
      testChargeCoulombs: coulombs(20e-9),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.electricFieldVectorNewtonsPerCoulomb).toEqual([0, 0]);
    expect(model.value.electricFieldStrengthNewtonsPerCoulomb).toBe(0);
    expect(model.value.potentialVolts).toBe(0);
    expect(model.value.potentialEnergyJoules).toBe(0);
  });

  it("rejects non-finite charges", () => {
    const force = electricForceOnCharge({
      electricFieldNewtonsPerCoulomb: [1, 0],
      testChargeCoulombs: coulombs(Number.NaN),
    });

    expect(force.ok).toBe(false);
    if (force.ok) throw new Error("Expected invalid charge to be rejected.");
    expect(force.error.code).toBe("precondition-violated");
  });

  it("reverses field direction when source charge sign changes", () => {
    const positive = pointChargeElectricField({
      pointMetres: [0.1, 0],
      sourceChargeCoulombs: coulombs(0.5e-6),
    });
    const negative = pointChargeElectricField({
      pointMetres: [0.1, 0],
      sourceChargeCoulombs: coulombs(-0.5e-6),
    });

    expect(positive.ok).toBe(true);
    expect(negative.ok).toBe(true);
    if (!positive.ok || !negative.ok) throw new Error("Expected valid field vectors.");
    expect(positive.value[0]).toBeGreaterThan(0);
    expect(negative.value[0]).toBeLessThan(0);
    expect(approxEqual(Math.abs(positive.value[0]), Math.abs(negative.value[0]), 1e-9)).toBe(true);
  });

  it("obeys inverse-square scaling over valid separations", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-9, max: 1e-6, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 0.25, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 0.25, noDefaultInfinity: true, noNaN: true }),
        (sourceCharge, separationA, separationB) => {
          fc.pre(Math.abs(separationA - separationB) > 0.005);
          const modelA = pointChargeModel({
            pointMetres: [separationA, 0],
            sourceChargeCoulombs: coulombs(sourceCharge),
            testChargeCoulombs: coulombs(20e-9),
          });
          const modelB = pointChargeModel({
            pointMetres: [separationB, 0],
            sourceChargeCoulombs: coulombs(sourceCharge),
            testChargeCoulombs: coulombs(20e-9),
          });

          expect(modelA.ok).toBe(true);
          expect(modelB.ok).toBe(true);
          if (!modelA.ok || !modelB.ok) return;
          const ratio =
            modelA.value.electricFieldStrengthNewtonsPerCoulomb /
            modelB.value.electricFieldStrengthNewtonsPerCoulomb;
          const expectedRatio = (separationB / separationA) ** 2;
          expect(approxEqual(ratio, expectedRatio, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});
