import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  metres,
  metresPerSecond,
  type KernelResult,
} from "@paideia/shared";
import {
  bernoulliPressureAtTarget,
  buoyantForce,
  classifyPipeFlow,
  continuityVelocity,
  cubicMetres,
  cubicMetresPerSecond,
  darcyFrictionFactor,
  dragCoefficient,
  dragForce,
  fluidMechanicsTolerance,
  hydrostaticGaugePressure,
  kilogramsPerCubicMetre,
  pascalSeconds,
  pascals,
  pipeHeadLoss,
  relativeRoughness,
  reynoldsNumber,
  squareMetres,
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
