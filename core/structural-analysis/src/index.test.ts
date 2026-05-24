import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { metres, newtons, type KernelResult } from "@paideia/shared";
import {
  axialElongation,
  axialStress,
  bendingStress,
  circularSectionProperties,
  cubicMetres,
  dimensionlessStrain,
  endConditionFactor,
  engineeringStrain,
  eulerBucklingLoad,
  metresToFourthPower,
  newtonMetres,
  pascals,
  principalStresses2D,
  rectangularSectionProperties,
  safetyFactor,
  squareMetres,
  structuralAnalysisTolerance,
  torsionalShearStress,
  vonMisesPlaneStress,
  youngModulus,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (result: KernelResult<unknown>, code: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

describe("@paideia/structural-analysis axial elasticity", () => {
  it("computes axial stress, strain, Young's modulus, and axial elongation", () => {
    expect(expectOk(axialStress({
      axialForceNewtons: newtons(10_000),
      areaSquareMetres: squareMetres(0.002),
    }))).toBeCloseTo(5_000_000, 9);

    expect(expectOk(engineeringStrain({
      elongationMetres: metres(0.002),
      originalLengthMetres: metres(2),
    }))).toBeCloseTo(0.001, 12);

    expect(expectOk(youngModulus({
      stressPascals: pascals(200_000_000),
      strain: dimensionlessStrain(0.001),
    }))).toBeCloseTo(200_000_000_000, 3);

    expect(expectOk(axialElongation({
      axialForceNewtons: newtons(10_000),
      lengthMetres: metres(2),
      areaSquareMetres: squareMetres(0.002),
      youngModulusPascals: pascals(200_000_000_000),
    }))).toBeCloseTo(0.00005, 12);

    expect(cubicMetres(0.25)).toBe(0.25);
  });

  it("rejects invalid axial elasticity inputs and non-physical modulus sign", () => {
    expectErrCode(axialStress({
      axialForceNewtons: newtons(10_000),
      areaSquareMetres: squareMetres(0),
    }), "precondition-violated");
    expectErrCode(engineeringStrain({
      elongationMetres: metres(0.001),
      originalLengthMetres: metres(0),
    }), "precondition-violated");
    expectErrCode(youngModulus({
      stressPascals: pascals(-200_000_000),
      strain: dimensionlessStrain(0.001),
    }), "out-of-domain");
    expectErrCode(axialElongation({
      axialForceNewtons: newtons(10_000),
      lengthMetres: metres(2),
      areaSquareMetres: squareMetres(0),
      youngModulusPascals: pascals(200_000_000_000),
    }), "precondition-violated");
  });

  it("is linear in axial force for fixed section area", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true, noDefaultInfinity: true }),
        (force, scale) => {
          const base = expectOk(axialStress({
            axialForceNewtons: newtons(force),
            areaSquareMetres: squareMetres(0.5),
          }));
          const scaled = expectOk(axialStress({
            axialForceNewtons: newtons(force * scale),
            areaSquareMetres: squareMetres(0.5),
          }));
          expect(scaled).toBeCloseTo(
            base * scale,
            Math.ceil(-Math.log10(structuralAnalysisTolerance.loose)),
          );
        },
      ),
    );
  });
});

describe("@paideia/structural-analysis section properties and member stresses", () => {
  it("computes rectangular and circular section properties", () => {
    const rectangle = expectOk(rectangularSectionProperties({
      widthMetres: metres(0.1),
      heightMetres: metres(0.2),
    }));
    expect(rectangle.areaSquareMetres).toBeCloseTo(0.02, 12);
    expect(rectangle.secondMomentAreaMetresToFourthPower).toBeCloseTo(0.0000666666667, 12);
    expect(rectangle.sectionModulusCubicMetres).toBeCloseTo(0.000666666667, 12);
    expect(rectangle.polarMomentMetresToFourthPower).toBeCloseTo(0.0000833333333, 12);
    expect(Object.isFrozen(rectangle)).toBe(true);

    const circle = expectOk(circularSectionProperties({
      diameterMetres: metres(0.1),
    }));
    expect(circle.areaSquareMetres).toBeCloseTo(Math.PI * 0.01 / 4, 12);
    expect(circle.secondMomentAreaMetresToFourthPower).toBeCloseTo(Math.PI * 0.0001 / 64, 12);
    expect(circle.sectionModulusCubicMetres).toBeCloseTo(Math.PI * 0.0001 / 64 / 0.05, 12);
    expect(circle.polarMomentMetresToFourthPower).toBeCloseTo(Math.PI * 0.0001 / 32, 12);
  });

  it("computes bending stress, torsional shear stress, and Euler buckling load", () => {
    expect(expectOk(bendingStress({
      bendingMomentNewtonMetres: newtonMetres(1_000),
      distanceFromNeutralAxisMetres: metres(0.1),
      secondMomentAreaMetresToFourthPower: metresToFourthPower(0.1 * 0.2 ** 3 / 12),
    }))).toBeCloseTo(1_500_000, 5);

    expect(expectOk(torsionalShearStress({
      torqueNewtonMetres: newtonMetres(500),
      radiusMetres: metres(0.05),
      polarMomentMetresToFourthPower: metresToFourthPower(Math.PI * 0.0001 / 32),
    }))).toBeCloseTo(2_546_479.089, 3);

    expect(expectOk(eulerBucklingLoad({
      youngModulusPascals: pascals(200_000_000_000),
      secondMomentAreaMetresToFourthPower: metresToFourthPower(0.000001),
      effectiveLengthMetres: metres(2),
      endConditionFactor: expectOk(endConditionFactor(1)),
    }))).toBeCloseTo(493_480.220, 3);

    expect(expectOk(eulerBucklingLoad({
      youngModulusPascals: pascals(200_000_000_000),
      secondMomentAreaMetresToFourthPower: metresToFourthPower(0.000001),
      effectiveLengthMetres: metres(4),
      endConditionFactor: expectOk(endConditionFactor(2)),
    }))).toBeCloseTo(123_370.055, 3);
  });

  it("rejects invalid section and stress inputs", () => {
    expectErrCode(rectangularSectionProperties({
      widthMetres: metres(0.1),
      heightMetres: metres(0),
    }), "precondition-violated");
    expectErrCode(circularSectionProperties({
      diameterMetres: metres(-0.1),
    }), "precondition-violated");
    expectErrCode(bendingStress({
      bendingMomentNewtonMetres: newtonMetres(1_000),
      distanceFromNeutralAxisMetres: metres(0.1),
      secondMomentAreaMetresToFourthPower: metresToFourthPower(0),
    }), "precondition-violated");
    expectErrCode(eulerBucklingLoad({
      youngModulusPascals: pascals(200_000_000_000),
      secondMomentAreaMetresToFourthPower: metresToFourthPower(0.000001),
      effectiveLengthMetres: metres(2),
      endConditionFactor: 0 as never,
    }), "precondition-violated");
    expectErrCode(endConditionFactor(0), "precondition-violated");
    expectErrCode(torsionalShearStress({
      torqueNewtonMetres: newtonMetres(500),
      radiusMetres: metres(0.05),
      polarMomentMetresToFourthPower: metresToFourthPower(0),
    }), "precondition-violated");
  });

  it("increases rectangular second moment monotonically with height", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const shortHeight = Math.min(a, b);
          const tallHeight = Math.max(a, b);
          const shortSection = expectOk(rectangularSectionProperties({
            widthMetres: metres(0.1),
            heightMetres: metres(shortHeight),
          }));
          const tallSection = expectOk(rectangularSectionProperties({
            widthMetres: metres(0.1),
            heightMetres: metres(tallHeight),
          }));
          expect(tallSection.secondMomentAreaMetresToFourthPower).toBeGreaterThanOrEqual(
            shortSection.secondMomentAreaMetresToFourthPower -
              structuralAnalysisTolerance.loose,
          );
        },
      ),
    );
  });
});

describe("@paideia/structural-analysis combined plane stress and safety", () => {
  it("computes principal stresses, von Mises stress, and safety factor", () => {
    const principal = expectOk(principalStresses2D({
      normalStressXPascals: pascals(100),
      normalStressYPascals: pascals(40),
      shearStressXYPascals: pascals(30),
    }));
    expect(principal.principalStress1Pascals).toBeCloseTo(112.426406871, 9);
    expect(principal.principalStress2Pascals).toBeCloseTo(27.573593129, 9);
    expect(principal.maxShearStressPascals).toBeCloseTo(42.426406871, 9);
    expect(principal.angleRadians).toBeCloseTo(Math.PI / 8, 12);
    expect(Object.isFrozen(principal)).toBe(true);

    expect(expectOk(vonMisesPlaneStress({
      normalStressXPascals: pascals(100),
      normalStressYPascals: pascals(40),
      shearStressXYPascals: pascals(30),
    }))).toBeCloseTo(Math.sqrt(10_300), 12);

    expect(expectOk(safetyFactor({
      allowableStressPascals: pascals(250),
      actualStressPascals: pascals(-100),
    }))).toBeCloseTo(2.5, 12);
  });

  it("rejects invalid plane stress and safety inputs and catches overflow", () => {
    expectErrCode(principalStresses2D({
      normalStressXPascals: pascals(Number.NaN),
      normalStressYPascals: pascals(0),
      shearStressXYPascals: pascals(0),
    }), "precondition-violated");
    expectErrCode(safetyFactor({
      allowableStressPascals: pascals(250),
      actualStressPascals: pascals(0),
    }), "precondition-violated");
    expectErrCode(vonMisesPlaneStress({
      normalStressXPascals: pascals(Number.MAX_VALUE),
      normalStressYPascals: pascals(Number.MAX_VALUE / 2),
      shearStressXYPascals: pascals(Number.MAX_VALUE / 3),
    }), "numerical-instability");
  });

  it("keeps principal stress magnitudes symmetric under shear sign reversal", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (sx, sy, tau) => {
          const positiveShear = expectOk(principalStresses2D({
            normalStressXPascals: pascals(sx),
            normalStressYPascals: pascals(sy),
            shearStressXYPascals: pascals(tau),
          }));
          const negativeShear = expectOk(principalStresses2D({
            normalStressXPascals: pascals(sx),
            normalStressYPascals: pascals(sy),
            shearStressXYPascals: pascals(-tau),
          }));
          expect(negativeShear.principalStress1Pascals).toBeCloseTo(
            positiveShear.principalStress1Pascals,
            Math.ceil(-Math.log10(structuralAnalysisTolerance.loose)),
          );
          expect(negativeShear.principalStress2Pascals).toBeCloseTo(
            positiveShear.principalStress2Pascals,
            Math.ceil(-Math.log10(structuralAnalysisTolerance.loose)),
          );
          expect(negativeShear.maxShearStressPascals).toBeCloseTo(
            positiveShear.maxShearStressPascals,
            Math.ceil(-Math.log10(structuralAnalysisTolerance.loose)),
          );
        },
      ),
    );
  });
});
