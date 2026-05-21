// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual, kilograms, metres, newtonsPerMetre, radians, seconds } from "@paideia/shared";
import { runOscillationsGateContract } from "./oscillations.contract.js";
import { oscillationsModel } from "./oscillations.js";

describe("oscillations sim", () => {
  it("computes the default oscillator through the mechanics SHM kernel", () => {
    const model = oscillationsModel({
      massKilograms: kilograms(2),
      springConstantNewtonsPerMetre: newtonsPerMetre(32),
      amplitudeMetres: metres(0.8),
      phaseRadians: radians(0),
      timeSeconds: seconds(0),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    // Hand-computed from SHM identities: omega = sqrt(k / m), T = 2pi / omega,
    // E = 1/2 k A^2, and a = -omega^2 x for m = 2 kg, k = 32 N m^-1, A = 0.8 m.
    expect(approxEqual(model.value.angularFrequencyRadiansPerSecond, 4)).toBe(true);
    expect(approxEqual(model.value.periodSeconds, Math.PI / 2)).toBe(true);
    expect(approxEqual(model.value.frequencyHertz, 2 / Math.PI)).toBe(true);
    expect(approxEqual(model.value.displacementMetres, 0.8)).toBe(true);
    expect(approxEqual(model.value.velocityMetresPerSecond, 0)).toBe(true);
    expect(approxEqual(model.value.accelerationMetresPerSecondSquared, -12.8)).toBe(true);
    expect(approxEqual(model.value.totalEnergyJoules, 10.24)).toBe(true);
    expect(approxEqual(model.value.potentialEnergyJoules, 10.24)).toBe(true);
    expect(approxEqual(model.value.kineticEnergyJoules, 0)).toBe(true);
    expect(model.value.phaseName).toBe("turning point");
    expect(model.value.trace).toHaveLength(49);
  });

  it("places maximum speed and zero acceleration at equilibrium", () => {
    const model = oscillationsModel({
      massKilograms: kilograms(2),
      springConstantNewtonsPerMetre: newtonsPerMetre(32),
      amplitudeMetres: metres(0.8),
      phaseRadians: radians(0),
      timeSeconds: seconds(Math.PI / 8),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.displacementMetres, 0, 1e-9)).toBe(true);
    expect(approxEqual(model.value.accelerationMetresPerSecondSquared, 0, 1e-9)).toBe(true);
    expect(approxEqual(Math.abs(model.value.velocityMetresPerSecond), 3.2)).toBe(true);
    expect(approxEqual(model.value.potentialEnergyJoules, 0, 1e-9)).toBe(true);
    expect(approxEqual(model.value.kineticEnergyJoules, model.value.totalEnergyJoules)).toBe(true);
    expect(model.value.phaseName).toBe("equilibrium crossing");
  });

  it("keeps period independent of amplitude when mass and spring stiffness are fixed", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 4, max: 80, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.1, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.1, max: 2, noDefaultInfinity: true, noNaN: true }),
        (mass, stiffness, amplitudeA, amplitudeB) => {
          const modelA = oscillationsModel({
            massKilograms: kilograms(mass),
            springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
            amplitudeMetres: metres(amplitudeA),
            phaseRadians: radians(0),
            timeSeconds: seconds(0),
          });
          const modelB = oscillationsModel({
            massKilograms: kilograms(mass),
            springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
            amplitudeMetres: metres(amplitudeB),
            phaseRadians: radians(0),
            timeSeconds: seconds(0),
          });

          expect(modelA.ok).toBe(true);
          expect(modelB.ok).toBe(true);
          if (!modelA.ok || !modelB.ok) return;
          expect(approxEqual(modelA.value.periodSeconds, modelB.value.periodSeconds, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521 },
    );
  });

  it("keeps acceleration opposite in sign to displacement", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 4, max: 80, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.1, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: Math.PI * 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 8, noDefaultInfinity: true, noNaN: true }),
        (mass, stiffness, amplitude, phase, time) => {
          const model = oscillationsModel({
            massKilograms: kilograms(mass),
            springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
            amplitudeMetres: metres(amplitude),
            phaseRadians: radians(phase),
            timeSeconds: seconds(time),
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const expectedAcceleration =
            -model.value.angularFrequencyRadiansPerSecond *
            model.value.angularFrequencyRadiansPerSecond *
            model.value.displacementMetres;
          expect(
            approxEqual(
              model.value.accelerationMetresPerSecondSquared,
              expectedAcceleration,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 20260522 },
    );
  });

  it("conserves total mechanical energy across the sampled trace", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 4, max: 80, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.1, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: Math.PI * 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 8, noDefaultInfinity: true, noNaN: true }),
        (mass, stiffness, amplitude, phase, time) => {
          const model = oscillationsModel({
            massKilograms: kilograms(mass),
            springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
            amplitudeMetres: metres(amplitude),
            phaseRadians: radians(phase),
            timeSeconds: seconds(time),
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return;

          expect(
            approxEqual(
              model.value.kineticEnergyJoules + model.value.potentialEnergyJoules,
              model.value.totalEnergyJoules,
              1e-8,
            ),
          ).toBe(true);
          for (const point of model.value.trace) {
            expect(
              approxEqual(
                point.kineticEnergyJoules + point.potentialEnergyJoules,
                model.value.totalEnergyJoules,
                1e-8,
              ),
            ).toBe(true);
          }
        },
      ),
      { seed: 20260523 },
    );
  });

  it("rejects invalid mass or spring stiffness through the KernelResult contract", () => {
    const invalidMass = oscillationsModel({
      massKilograms: kilograms(0),
      springConstantNewtonsPerMetre: newtonsPerMetre(32),
      amplitudeMetres: metres(0.8),
      phaseRadians: radians(0),
      timeSeconds: seconds(0),
    });
    const invalidStiffness = oscillationsModel({
      massKilograms: kilograms(2),
      springConstantNewtonsPerMetre: newtonsPerMetre(0),
      amplitudeMetres: metres(0.8),
      phaseRadians: radians(0),
      timeSeconds: seconds(0),
    });

    expect(invalidMass.ok).toBe(false);
    if (!invalidMass.ok) expect(invalidMass.error.code).toBe("precondition-violated");
    expect(invalidStiffness.ok).toBe(false);
    if (!invalidStiffness.ok) expect(invalidStiffness.error.code).toBe("precondition-violated");
  });
});

runOscillationsGateContract();
