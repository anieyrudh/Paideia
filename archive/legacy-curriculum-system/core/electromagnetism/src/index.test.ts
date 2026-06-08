import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  coulombs,
  coulombsPerMetre,
  coulombsPerSquareMetre,
  degrees,
  electricForceOnCharge,
  electricFluxFromEnclosedCharge,
  electricFluxThroughSurface,
  electromagneticWaveModel,
  enclosedChargeFromElectricFlux,
  gaussLawSymmetricFieldModel,
  hertz,
  ohms,
  parallelPlateCapacitorModel,
  pointChargeElectricField,
  pointChargeModel,
  seconds,
  squareMetres,
  speedOfLightVacuumMetresPerSecond,
  teslas,
  volts,
  uniformFluxInductionModel,
  vacuumPermittivityFaradsPerMetre,
  voltsPerMetre,
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

describe("parallel-plate capacitor electromagnetism", () => {
  it("computes capacitance, charge, stored energy, field, and energy density", () => {
    const model = parallelPlateCapacitorModel({
      dielectricConstant: 3,
      plateAreaSquareMetres: 0.008,
      plateSeparationMetres: 0.001,
      voltageVolts: volts(12),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.capacitanceFarads, 2.125005075072e-10, 1e-12)).toBe(true);
    expect(approxEqual(model.value.chargeCoulombs, 2.5500060900864e-9, 1e-12)).toBe(true);
    expect(approxEqual(model.value.energyJoules, 1.53000365405184e-8, 1e-12)).toBe(true);
    expect(approxEqual(model.value.electricFieldVoltsPerMetre, 12000, 1e-12)).toBe(true);
    expect(approxEqual(model.value.energyDensityJoulesPerCubicMetre, 0.0019125045675648, 1e-12)).toBe(true);
  });

  it("rejects non-positive geometry or dielectric inputs", () => {
    const model = parallelPlateCapacitorModel({
      dielectricConstant: 0,
      plateAreaSquareMetres: 0.008,
      plateSeparationMetres: 0.001,
      voltageVolts: volts(12),
    });

    expect(model.ok).toBe(false);
    if (model.ok) throw new Error("Expected zero dielectric constant to be rejected.");
    expect(model.error.code).toBe("precondition-violated");
  });

  it("preserves linear, inverse, voltage-squared, and charge invariants", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-5, max: 0.5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1e-5, max: 0.05, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 12, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 1000, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1.2, max: 5, noDefaultInfinity: true, noNaN: true }),
        (area, separation, dielectric, voltage, factor) => {
          const base = parallelPlateCapacitorModel({
            dielectricConstant: dielectric,
            plateAreaSquareMetres: area,
            plateSeparationMetres: separation,
            voltageVolts: volts(voltage),
          });
          const areaScaled = parallelPlateCapacitorModel({
            dielectricConstant: dielectric,
            plateAreaSquareMetres: area * factor,
            plateSeparationMetres: separation,
            voltageVolts: volts(voltage),
          });
          const separationScaled = parallelPlateCapacitorModel({
            dielectricConstant: dielectric,
            plateAreaSquareMetres: area,
            plateSeparationMetres: separation * factor,
            voltageVolts: volts(voltage),
          });
          const voltageScaled = parallelPlateCapacitorModel({
            dielectricConstant: dielectric,
            plateAreaSquareMetres: area,
            plateSeparationMetres: separation,
            voltageVolts: volts(voltage * factor),
          });

          expect(base.ok).toBe(true);
          expect(areaScaled.ok).toBe(true);
          expect(separationScaled.ok).toBe(true);
          expect(voltageScaled.ok).toBe(true);
          if (!base.ok || !areaScaled.ok || !separationScaled.ok || !voltageScaled.ok) return;

          expect(
            approxEqual(
              areaScaled.value.capacitanceFarads / base.value.capacitanceFarads,
              factor,
              1e-9,
            ),
          ).toBe(true);
          expect(
            approxEqual(
              separationScaled.value.capacitanceFarads / base.value.capacitanceFarads,
              1 / factor,
              1e-9,
            ),
          ).toBe(true);
          expect(
            approxEqual(
              voltageScaled.value.energyJoules / base.value.energyJoules,
              factor * factor,
              1e-9,
            ),
          ).toBe(true);
          expect(
            approxEqual(
              base.value.chargeCoulombs,
              base.value.capacitanceFarads * voltage,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 20260527, numRuns: 80 },
    );
  });
});

describe("Gauss-law symmetric electromagnetism", () => {
  it("computes signed electric flux through a flat Gaussian surface patch", () => {
    const faceOn = electricFluxThroughSurface({
      angleToNormalDegrees: degrees(0),
      areaSquareMetres: squareMetres(0.25),
      electricFieldVoltsPerMetre: voltsPerMetre(12),
    });
    const tilted = electricFluxThroughSurface({
      angleToNormalDegrees: degrees(60),
      areaSquareMetres: squareMetres(0.25),
      electricFieldVoltsPerMetre: voltsPerMetre(12),
    });
    const reversed = electricFluxThroughSurface({
      angleToNormalDegrees: degrees(180),
      areaSquareMetres: squareMetres(0.25),
      electricFieldVoltsPerMetre: voltsPerMetre(12),
    });

    expect(faceOn.ok).toBe(true);
    expect(tilted.ok).toBe(true);
    expect(reversed.ok).toBe(true);
    if (!faceOn.ok || !tilted.ok || !reversed.ok) throw new Error("Expected valid flux values.");
    expect(approxEqual(faceOn.value, 3, 1e-12)).toBe(true);
    expect(approxEqual(tilted.value, 1.5, 1e-12)).toBe(true);
    expect(approxEqual(reversed.value, -3, 1e-12)).toBe(true);
  });

  it("converts between enclosed charge and total electric flux", () => {
    const flux = electricFluxFromEnclosedCharge({
      enclosedChargeCoulombs: coulombs(2.4e-9),
    });

    expect(flux.ok).toBe(true);
    if (!flux.ok) throw new Error(flux.error.message);
    expect(approxEqual(flux.value, 2.4e-9 / vacuumPermittivityFaradsPerMetre, 1e-12)).toBe(true);

    const charge = enclosedChargeFromElectricFlux({
      electricFluxVoltsMetres: flux.value,
    });

    expect(charge.ok).toBe(true);
    if (!charge.ok) throw new Error(charge.error.message);
    expect(approxEqual(charge.value, 2.4e-9, 1e-12)).toBe(true);
  });

  it("models spherical, cylindrical, and planar Gaussian surfaces", () => {
    const spherical = gaussLawSymmetricFieldModel({
      enclosedChargeCoulombs: coulombs(2e-9),
      radiusMetres: 0.2,
      symmetry: "spherical",
    });
    const cylindrical = gaussLawSymmetricFieldModel({
      lengthMetres: 0.4,
      linearChargeDensityCoulombsPerMetre: coulombsPerMetre(3e-9),
      radiusMetres: 0.05,
      symmetry: "cylindrical",
    });
    const planar = gaussLawSymmetricFieldModel({
      pillboxFaceAreaSquareMetres: squareMetres(0.03),
      surfaceChargeDensityCoulombsPerSquareMetre: coulombsPerSquareMetre(4e-9),
      symmetry: "planar",
    });

    expect(spherical.ok).toBe(true);
    expect(cylindrical.ok).toBe(true);
    expect(planar.ok).toBe(true);
    if (!spherical.ok || !cylindrical.ok || !planar.ok) {
      throw new Error("Expected valid symmetric Gauss-law models.");
    }
    expect(
      approxEqual(
        spherical.value.electricFieldVoltsPerMetre,
        2e-9 / (vacuumPermittivityFaradsPerMetre * 4 * Math.PI * 0.2 * 0.2),
        1e-12,
      ),
    ).toBe(true);
    expect(approxEqual(cylindrical.value.enclosedChargeCoulombs, 1.2e-9, 1e-12)).toBe(true);
    expect(
      approxEqual(
        cylindrical.value.electricFieldVoltsPerMetre,
        3e-9 / (2 * Math.PI * vacuumPermittivityFaradsPerMetre * 0.05),
        1e-12,
      ),
    ).toBe(true);
    expect(approxEqual(planar.value.enclosedChargeCoulombs, 1.2e-10, 1e-12)).toBe(true);
    expect(
      approxEqual(
        planar.value.electricFieldVoltsPerMetre,
        4e-9 / (2 * vacuumPermittivityFaradsPerMetre),
        1e-12,
      ),
    ).toBe(true);
  });

  it("rejects invalid Gauss-law geometry and angles", () => {
    const invalidAngle = electricFluxThroughSurface({
      angleToNormalDegrees: degrees(181),
      areaSquareMetres: squareMetres(1),
      electricFieldVoltsPerMetre: voltsPerMetre(1),
    });
    const invalidSphere = gaussLawSymmetricFieldModel({
      enclosedChargeCoulombs: coulombs(1e-9),
      radiusMetres: 0,
      symmetry: "spherical",
    });
    const invalidPlane = gaussLawSymmetricFieldModel({
      pillboxFaceAreaSquareMetres: squareMetres(0),
      surfaceChargeDensityCoulombsPerSquareMetre: coulombsPerSquareMetre(1e-9),
      symmetry: "planar",
    });

    expect(invalidAngle.ok).toBe(false);
    expect(invalidSphere.ok).toBe(false);
    expect(invalidPlane.ok).toBe(false);
    if (invalidAngle.ok || invalidSphere.ok || invalidPlane.ok) {
      throw new Error("Expected invalid Gauss-law inputs to be rejected.");
    }
    expect(invalidAngle.error.code).toBe("precondition-violated");
    expect(invalidSphere.error.code).toBe("precondition-violated");
    expect(invalidPlane.error.code).toBe("precondition-violated");
  });

  it("preserves Gauss-law scaling invariants", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-10, max: 1e-6, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1.2, max: 5, noDefaultInfinity: true, noNaN: true }),
        (charge, radius, factor) => {
          const base = gaussLawSymmetricFieldModel({
            enclosedChargeCoulombs: coulombs(charge),
            radiusMetres: radius,
            symmetry: "spherical",
          });
          const farther = gaussLawSymmetricFieldModel({
            enclosedChargeCoulombs: coulombs(charge),
            radiusMetres: radius * factor,
            symmetry: "spherical",
          });
          const flux = electricFluxFromEnclosedCharge({
            enclosedChargeCoulombs: coulombs(charge),
          });

          expect(base.ok).toBe(true);
          expect(farther.ok).toBe(true);
          expect(flux.ok).toBe(true);
          if (!base.ok || !farther.ok || !flux.ok) return;

          expect(
            approxEqual(
              farther.value.electricFieldVoltsPerMetre /
                base.value.electricFieldVoltsPerMetre,
              1 / (factor * factor),
              1e-9,
            ),
          ).toBe(true);
          expect(approxEqual(base.value.electricFluxVoltsMetres, flux.value, 1e-12)).toBe(true);
          expect(approxEqual(farther.value.electricFluxVoltsMetres, flux.value, 1e-12)).toBe(true);
        },
      ),
      { seed: 20260527, numRuns: 80 },
    );
  });
});

describe("uniform flux induction", () => {
  it("computes Faraday emf and Lenz opposition for increasing flux", () => {
    const model = uniformFluxInductionModel({
      angleToNormalDegrees: degrees(0),
      circuitResistanceOhms: ohms(5),
      durationSeconds: seconds(0.2),
      finalFieldTeslas: teslas(0.8),
      initialFieldTeslas: teslas(0.2),
      loopAreaSquareMetres: squareMetres(0.03),
      turns: 40,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.initialFluxWebers, 0.006, 1e-12)).toBe(true);
    expect(approxEqual(model.value.finalFluxWebers, 0.024, 1e-12)).toBe(true);
    expect(approxEqual(model.value.inducedEmfVolts, -3.6, 1e-12)).toBe(true);
    expect(approxEqual(model.value.inducedCurrentAmps, 0.72, 1e-12)).toBe(true);
    expect(model.value.lenzOpposition).toBe("oppose-increase");
    expect(model.value.inducedFieldDirection).toBe("into-page");
  });

  it("uses the angle to the loop normal in the flux projection", () => {
    const faceOn = uniformFluxInductionModel({
      angleToNormalDegrees: degrees(0),
      circuitResistanceOhms: ohms(10),
      durationSeconds: seconds(0.5),
      finalFieldTeslas: teslas(0.4),
      initialFieldTeslas: teslas(0.1),
      loopAreaSquareMetres: squareMetres(0.02),
      turns: 10,
    });
    const tilted = uniformFluxInductionModel({
      angleToNormalDegrees: degrees(60),
      circuitResistanceOhms: ohms(10),
      durationSeconds: seconds(0.5),
      finalFieldTeslas: teslas(0.4),
      initialFieldTeslas: teslas(0.1),
      loopAreaSquareMetres: squareMetres(0.02),
      turns: 10,
    });

    expect(faceOn.ok).toBe(true);
    expect(tilted.ok).toBe(true);
    if (!faceOn.ok || !tilted.ok) throw new Error("Expected valid induction models.");
    expect(approxEqual(tilted.value.inducedEmfMagnitudeVolts / faceOn.value.inducedEmfMagnitudeVolts, 0.5, 1e-12)).toBe(true);
  });

  it("rejects invalid turns and timing", () => {
    const model = uniformFluxInductionModel({
      angleToNormalDegrees: degrees(0),
      circuitResistanceOhms: ohms(5),
      durationSeconds: seconds(0),
      finalFieldTeslas: teslas(0.8),
      initialFieldTeslas: teslas(0.2),
      loopAreaSquareMetres: squareMetres(0.03),
      turns: 40,
    });

    expect(model.ok).toBe(false);
    if (model.ok) throw new Error("Expected zero duration to be rejected.");
    expect(model.error.code).toBe("precondition-violated");
  });
});

describe("electromagnetic wave model", () => {
  it("connects Maxwell wave speed, wavelength, and field amplitudes", () => {
    const model = electromagneticWaveModel({
      electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(10),
      frequencyHertz: hertz(100e6),
      relativePermeability: 1,
      relativePermittivity: 1,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.speedMetresPerSecond, speedOfLightVacuumMetresPerSecond, 1e-12)).toBe(true);
    expect(approxEqual(model.value.wavelengthMetres, 2.99792458, 1e-12)).toBe(true);
    expect(approxEqual(model.value.magneticFieldAmplitudeTesla, 3.3356409519815205e-8, 1e-12)).toBe(true);
    expect(model.value.spectrumBand).toBe("radio");
  });

  it("slows waves in higher relative permittivity media", () => {
    const vacuum = electromagneticWaveModel({
      electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(4),
      frequencyHertz: hertz(3e14),
      relativePermeability: 1,
      relativePermittivity: 1,
    });
    const glass = electromagneticWaveModel({
      electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(4),
      frequencyHertz: hertz(3e14),
      relativePermeability: 1,
      relativePermittivity: 2.25,
    });

    expect(vacuum.ok).toBe(true);
    expect(glass.ok).toBe(true);
    if (!vacuum.ok || !glass.ok) throw new Error("Expected valid wave models.");
    expect(glass.value.speedMetresPerSecond).toBeLessThan(vacuum.value.speedMetresPerSecond);
    expect(glass.value.wavelengthMetres).toBeLessThan(vacuum.value.wavelengthMetres);
  });

  it("rejects non-positive frequency or field amplitude", () => {
    const invalidFrequency = electromagneticWaveModel({
      electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(1),
      frequencyHertz: hertz(0),
      relativePermeability: 1,
      relativePermittivity: 1,
    });
    const invalidField = electromagneticWaveModel({
      electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(0),
      frequencyHertz: hertz(5e14),
      relativePermeability: 1,
      relativePermittivity: 1,
    });

    expect(invalidFrequency.ok).toBe(false);
    expect(invalidField.ok).toBe(false);
    if (invalidFrequency.ok || invalidField.ok) {
      throw new Error("Expected invalid wave inputs to be rejected.");
    }
    expect(invalidFrequency.error.code).toBe("precondition-violated");
    expect(invalidField.error.code).toBe("precondition-violated");
  });
});
