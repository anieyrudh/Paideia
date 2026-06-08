import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  degrees,
  metres,
  metresPerSecond,
  type KernelResult,
} from "@paideia/shared";
import {
  bernoulliPressureAtTarget,
  buoyantForce,
  capillaryRiseHeight,
  classifyPipeFlow,
  classifyPecletTransport,
  continuityVelocity,
  cubicMetres,
  cubicMetresPerSecond,
  darcyFrictionFactor,
  dragCoefficient,
  dragForce,
  fluidMechanicsTolerance,
  hydrostaticGaugePressure,
  kilogramsPerCubicMetre,
  metresSquaredPerSecond,
  pascalSeconds,
  pascals,
  pecletNumber,
  pipeHeadLoss,
  planeCouetteFlow,
  poiseuillePipeFlow,
  relativeRoughness,
  reynoldsNumber,
  squareMetres,
  stokesDragForce,
  surfaceTensionNewtonsPerMetre,
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

describe("@paideia/fluid-mechanics Reynolds and flow regime", () => {
  it("computes Reynolds number and pipe-flow regime", () => {
    const re = expectOk(reynoldsNumber({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(998),
      velocityMetresPerSecond: metresPerSecond(2),
      characteristicLengthMetres: metres(0.05),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    }));

    expect(re).toBeCloseTo(99_800, 9);
    expect(classifyPipeFlow(re)).toBe("turbulent");
    expect(classifyPipeFlow(expectOk(reynoldsNumber({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      velocityMetresPerSecond: metresPerSecond(0.01),
      characteristicLengthMetres: metres(0.01),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    })))).toBe("laminar");
  });

  it("classifies pipe-flow boundary regimes explicitly", () => {
    expect(classifyPipeFlow(1_999.999 as never)).toBe("laminar");
    expect(classifyPipeFlow(2_000 as never)).toBe("transition");
    expect(classifyPipeFlow(4_000 as never)).toBe("transition");
    expect(classifyPipeFlow(4_000.001 as never)).toBe("turbulent");
  });

  it("rejects invalid Reynolds inputs and roughness", () => {
    expectErrCode(reynoldsNumber({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      velocityMetresPerSecond: metresPerSecond(1),
      characteristicLengthMetres: metres(0.1),
      dynamicViscosityPascalSeconds: pascalSeconds(0),
    }), "precondition-violated");
    expectErrCode(relativeRoughness(0.5), "out-of-domain");
  });

  it("is linear in velocity for fixed fluid and length", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true, noDefaultInfinity: true }),
        (velocity, scale) => {
          const base = expectOk(reynoldsNumber({
            densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1.2),
            velocityMetresPerSecond: metresPerSecond(velocity),
            characteristicLengthMetres: metres(0.4),
            dynamicViscosityPascalSeconds: pascalSeconds(0.000018),
          }));
          const scaled = expectOk(reynoldsNumber({
            densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1.2),
            velocityMetresPerSecond: metresPerSecond(velocity * scale),
            characteristicLengthMetres: metres(0.4),
            dynamicViscosityPascalSeconds: pascalSeconds(0.000018),
          }));
          expect(scaled).toBeCloseTo(
            base * scale,
            Math.ceil(-Math.log10(fluidMechanicsTolerance.loose)),
          );
        },
      ),
    );
  });
});

describe("@paideia/fluid-mechanics hydrostatics and buoyancy", () => {
  it("computes gauge pressure with p = rho g h and buoyancy with rho g V", () => {
    expect(expectOk(hydrostaticGaugePressure({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      depthMetres: metres(3),
    }))).toBeCloseTo(29_419.95, 9);

    expect(expectOk(buoyantForce({
      fluidDensityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      displacedVolumeCubicMetres: cubicMetres(0.015),
    }))).toBeCloseTo(147.09975, 9);
  });

  it("rejects invalid hydrostatic inputs", () => {
    expectErrCode(hydrostaticGaugePressure({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      depthMetres: metres(-1),
    }), "precondition-violated");

    expectErrCode(buoyantForce({
      fluidDensityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      displacedVolumeCubicMetres: cubicMetres(-0.01),
    }), "precondition-violated");
  });

  it("increases hydrostatic pressure monotonically with depth", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const shallow = Math.min(a, b);
          const deep = Math.max(a, b);
          const shallowPressure = expectOk(hydrostaticGaugePressure({
            densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
            depthMetres: metres(shallow),
          }));
          const deepPressure = expectOk(hydrostaticGaugePressure({
            densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
            depthMetres: metres(deep),
          }));
          expect(deepPressure).toBeGreaterThanOrEqual(
            shallowPressure - fluidMechanicsTolerance.loose,
          );
        },
      ),
    );
  });
});

describe("@paideia/fluid-mechanics continuity and Bernoulli", () => {
  it("computes continuity velocity and Bernoulli pressure drop", () => {
    expect(expectOk(continuityVelocity({
      volumetricFlowRateCubicMetresPerSecond: cubicMetresPerSecond(0.2),
      areaSquareMetres: squareMetres(0.05),
    }))).toBeCloseTo(4, 12);

    const pressure = expectOk(bernoulliPressureAtTarget({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      sourcePressurePascals: pascals(200_000),
      sourceVelocityMetresPerSecond: metresPerSecond(2),
      sourceElevationMetres: metres(0),
      targetVelocityMetresPerSecond: metresPerSecond(6),
      targetElevationMetres: metres(0),
    }));
    expect(pressure).toBeCloseTo(184_000, 9);
  });

  it("rejects impossible Bernoulli target pressure and invalid area", () => {
    expectErrCode(continuityVelocity({
      volumetricFlowRateCubicMetresPerSecond: cubicMetresPerSecond(0.2),
      areaSquareMetres: squareMetres(0),
    }), "precondition-violated");
    expectErrCode(bernoulliPressureAtTarget({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
      sourcePressurePascals: pascals(1_000),
      sourceVelocityMetresPerSecond: metresPerSecond(1),
      sourceElevationMetres: metres(0),
      targetVelocityMetresPerSecond: metresPerSecond(100),
      targetElevationMetres: metres(0),
    }), "out-of-domain");
  });
});

describe("@paideia/fluid-mechanics pipe loss and drag", () => {
  it("computes Darcy friction factor, head loss, and drag force", () => {
    const laminar = expectOk(darcyFrictionFactor({
      reynoldsNumber: expectOk(reynoldsNumber({
        densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1000),
        velocityMetresPerSecond: metresPerSecond(0.05),
        characteristicLengthMetres: metres(0.01),
        dynamicViscosityPascalSeconds: pascalSeconds(0.001),
      })),
      relativeRoughness: expectOk(relativeRoughness(0)),
    }));
    expect(laminar.regime).toBe("laminar");
    expect(laminar.method).toBe("poiseuille");
    expect(laminar.frictionFactor).toBeCloseTo(0.128, 12);
    expect(Object.isFrozen(laminar)).toBe(true);

    const turbulent = expectOk(darcyFrictionFactor({
      reynoldsNumber: expectOk(reynoldsNumber({
        densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(998),
        velocityMetresPerSecond: metresPerSecond(2),
        characteristicLengthMetres: metres(0.05),
        dynamicViscosityPascalSeconds: pascalSeconds(0.001),
      })),
      relativeRoughness: expectOk(relativeRoughness(0.0002)),
    }));
    expect(turbulent.regime).toBe("turbulent");
    expect(turbulent.method).toBe("haaland");
    expect(turbulent.frictionFactor).toBeGreaterThan(0);

    expect(expectOk(pipeHeadLoss({
      frictionFactor: turbulent.frictionFactor,
      pipeLengthMetres: metres(100),
      pipeDiameterMetres: metres(0.05),
      velocityMetresPerSecond: metresPerSecond(2),
    }))).toBeCloseTo(
      turbulent.frictionFactor * (100 / 0.05) * (4 / (2 * 9.80665)),
      9,
    );

    expect(expectOk(dragForce({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1.2),
      relativeVelocityMetresPerSecond: metresPerSecond(10),
      dragCoefficient: expectOk(dragCoefficient(1.05)),
      referenceAreaSquareMetres: squareMetres(0.7),
    }))).toBeCloseTo(44.1, 12);
  });

  it("rejects invalid pipe and drag values and non-finite derived values", () => {
    expectErrCode(pipeHeadLoss({
      frictionFactor: 0 as never,
      pipeLengthMetres: metres(100),
      pipeDiameterMetres: metres(0.05),
      velocityMetresPerSecond: metresPerSecond(2),
    }), "precondition-violated");
    expectErrCode(pipeHeadLoss({
      frictionFactor: 0.02 as never,
      pipeLengthMetres: metres(0),
      pipeDiameterMetres: metres(0.05),
      velocityMetresPerSecond: metresPerSecond(2),
    }), "precondition-violated");
    expectErrCode(darcyFrictionFactor({
      reynoldsNumber: 0 as never,
      relativeRoughness: expectOk(relativeRoughness(0)),
    }), "precondition-violated");
    expectErrCode(dragCoefficient(Number.NaN), "precondition-violated");
    expectErrCode(dragForce({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1.2),
      relativeVelocityMetresPerSecond: metresPerSecond(10),
      dragCoefficient: expectOk(dragCoefficient(1)),
      referenceAreaSquareMetres: squareMetres(0),
    }), "precondition-violated");
    expectErrCode(dragForce({
      densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(Number.MAX_VALUE),
      relativeVelocityMetresPerSecond: metresPerSecond(Number.MAX_VALUE),
      dragCoefficient: expectOk(dragCoefficient(1)),
      referenceAreaSquareMetres: squareMetres(Number.MAX_VALUE),
    }), "numerical-instability");
  });
});

describe("@paideia/fluid-mechanics viscous and microfluidic helpers", () => {
  it("computes Hagen-Poiseuille pipe flow and freezes the result", () => {
    const flow = expectOk(poiseuillePipeFlow({
      pressureDropPascals: pascals(1_000),
      pipeRadiusMetres: metres(0.001),
      pipeLengthMetres: metres(0.1),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    }));

    expect(flow.volumetricFlowRateCubicMetresPerSecond).toBeCloseTo(3.926990817e-6, 12);
    expect(flow.meanVelocityMetresPerSecond).toBeCloseTo(1.25, 12);
    expect(flow.wallShearStressPascals).toBeCloseTo(5, 12);
    expect(flow.hydraulicResistancePascalsPerCubicMetrePerSecond).toBeCloseTo(
      254_647_908.947,
      3,
    );
    expect(Object.isFrozen(flow)).toBe(true);
  });

  it("computes plane Couette velocity and shear stress and freezes the result", () => {
    const flow = expectOk(planeCouetteFlow({
      movingPlateSpeedMetresPerSecond: metresPerSecond(0.02),
      gapHeightMetres: metres(0.001),
      positionAcrossGapMetres: metres(0.00025),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    }));

    expect(flow.localVelocityMetresPerSecond).toBeCloseTo(0.005, 12);
    expect(flow.shearRatePerSecond).toBeCloseTo(20, 12);
    expect(flow.shearStressPascals).toBeCloseTo(0.02, 12);
    expect(Object.isFrozen(flow)).toBe(true);
  });

  it("computes Stokes drag, capillary rise, and Peclet number", () => {
    expect(expectOk(stokesDragForce({
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
      sphereRadiusMetres: metres(1e-6),
      relativeVelocityMetresPerSecond: metresPerSecond(0.001),
    }))).toBeCloseTo(1.884955592e-11, 20);

    expect(expectOk(capillaryRiseHeight({
      surfaceTensionNewtonsPerMetre: surfaceTensionNewtonsPerMetre(0.072),
      contactAngleDegrees: degrees(0),
      liquidDensityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1_000),
      tubeRadiusMetres: metres(0.0005),
    }))).toBeCloseTo(0.029367827, 9);

    const pe = expectOk(pecletNumber({
      velocityMetresPerSecond: metresPerSecond(0.001),
      characteristicLengthMetres: metres(0.0001),
      diffusivityMetresSquaredPerSecond: metresSquaredPerSecond(1e-9),
    }));
    expect(pe).toBeCloseTo(100, 12);
    expect(classifyPecletTransport(pe)).toBe("advection-dominated");
    expect(classifyPecletTransport(0.05 as never)).toBe("diffusion-dominated");
    expect(classifyPecletTransport(1 as never)).toBe("mixed");
  });

  it("rejects invalid viscous and microfluidic inputs", () => {
    expectErrCode(poiseuillePipeFlow({
      pressureDropPascals: pascals(-1),
      pipeRadiusMetres: metres(0.001),
      pipeLengthMetres: metres(0.1),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    }), "precondition-violated");
    expectErrCode(poiseuillePipeFlow({
      pressureDropPascals: pascals(1_000),
      pipeRadiusMetres: metres(0.001),
      pipeLengthMetres: metres(0.1),
      dynamicViscosityPascalSeconds: pascalSeconds(0),
    }), "precondition-violated");
    expectErrCode(planeCouetteFlow({
      movingPlateSpeedMetresPerSecond: metresPerSecond(0.02),
      gapHeightMetres: metres(0.001),
      positionAcrossGapMetres: metres(0.002),
      dynamicViscosityPascalSeconds: pascalSeconds(0.001),
    }), "out-of-domain");
    expectErrCode(capillaryRiseHeight({
      surfaceTensionNewtonsPerMetre: surfaceTensionNewtonsPerMetre(0.072),
      contactAngleDegrees: degrees(181),
      liquidDensityKilogramsPerCubicMetre: kilogramsPerCubicMetre(1_000),
      tubeRadiusMetres: metres(0.0005),
    }), "out-of-domain");
    expectErrCode(pecletNumber({
      velocityMetresPerSecond: metresPerSecond(0.001),
      characteristicLengthMetres: metres(0.0001),
      diffusivityMetresSquaredPerSecond: metresSquaredPerSecond(0),
    }), "precondition-violated");
  });

  it("scales Hagen-Poiseuille flow with radius to the fourth power", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.0002, max: 0.002, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.5, max: 2, noNaN: true, noDefaultInfinity: true }),
        (radius, scale) => {
          const base = expectOk(poiseuillePipeFlow({
            pressureDropPascals: pascals(800),
            pipeRadiusMetres: metres(radius),
            pipeLengthMetres: metres(0.08),
            dynamicViscosityPascalSeconds: pascalSeconds(0.0012),
          }));
          const scaled = expectOk(poiseuillePipeFlow({
            pressureDropPascals: pascals(800),
            pipeRadiusMetres: metres(radius * scale),
            pipeLengthMetres: metres(0.08),
            dynamicViscosityPascalSeconds: pascalSeconds(0.0012),
          }));

          expect(scaled.volumetricFlowRateCubicMetresPerSecond).toBeCloseTo(
            base.volumetricFlowRateCubicMetresPerSecond * scale ** 4,
            Math.ceil(-Math.log10(fluidMechanicsTolerance.loose)),
          );
        },
      ),
    );
  });

  it("keeps Stokes drag and Peclet number linear in velocity", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.02, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true, noDefaultInfinity: true }),
        (velocity, scale) => {
          const baseDrag = expectOk(stokesDragForce({
            dynamicViscosityPascalSeconds: pascalSeconds(0.001),
            sphereRadiusMetres: metres(2e-6),
            relativeVelocityMetresPerSecond: metresPerSecond(velocity),
          }));
          const scaledDrag = expectOk(stokesDragForce({
            dynamicViscosityPascalSeconds: pascalSeconds(0.001),
            sphereRadiusMetres: metres(2e-6),
            relativeVelocityMetresPerSecond: metresPerSecond(velocity * scale),
          }));
          expect(scaledDrag).toBeCloseTo(
            baseDrag * scale,
            Math.ceil(-Math.log10(fluidMechanicsTolerance.loose)),
          );

          const basePe = expectOk(pecletNumber({
            velocityMetresPerSecond: metresPerSecond(velocity),
            characteristicLengthMetres: metres(0.0001),
            diffusivityMetresSquaredPerSecond: metresSquaredPerSecond(1e-9),
          }));
          const scaledPe = expectOk(pecletNumber({
            velocityMetresPerSecond: metresPerSecond(velocity * scale),
            characteristicLengthMetres: metres(0.0001),
            diffusivityMetresSquaredPerSecond: metresSquaredPerSecond(1e-9),
          }));
          expect(scaledPe).toBeCloseTo(
            basePe * scale,
            Math.ceil(-Math.log10(fluidMechanicsTolerance.loose)),
          );
        },
      ),
    );
  });
});
