import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  approxEqual,
  joules,
  kilograms,
  metres,
  metresPerSecond,
  newtons,
  newtonsPerMetre,
  radians,
  radiansPerSecond,
  seconds,
} from "@paideia/shared";
import {
  accelerationFromForce,
  averagePower,
  circularOrbitSpeed,
  gravitationalAccelerationFromForce,
  elasticCollision1D,
  gravitationalFieldStrengthRatio,
  gravitationalFieldVector2D,
  gravitationalFieldStrength,
  gravitationalForce,
  gravitationalInverseSquareScale,
  gravitationalPotential,
  gravitationalPotentialEnergy,
  kineticEnergy,
  kinematics1D,
  mechanicsTolerance,
  momentum1D,
  netForce,
  projectileAt,
  simpleHarmonicMotion,
  springOscillator,
  uniformCircularMotion,
  universalGravitationalConstant,
  workDone,
  workEnergyTransfer,
  type Vector2,
} from "./index.js";

const deterministicCases = (count: number): readonly number[] =>
  Array.from({ length: count }, (_, index) => (index - count / 2) / 7);

describe("@paideia/mechanics", () => {
  it("computes one-dimensional constant-acceleration state", () => {
    const state = kinematics1D({
      initialPositionMetres: metres(2),
      initialVelocityMetresPerSecond: 3,
      accelerationMetresPerSecondSquared: 4,
      elapsedSeconds: seconds(5),
    });

    expect(state.ok).toBe(true);
    if (state.ok) {
      expect(state.value.positionMetres).toBe(67);
      expect(state.value.displacementMetres).toBe(65);
      expect(state.value.velocityMetresPerSecond).toBe(23);
    }
  });

  it("satisfies the SUVAT identity across deterministic property cases", () => {
    for (const base of deterministicCases(80)) {
      const initialVelocity = base * 2;
      const acceleration = base / 3 + 0.8;
      const elapsed = Math.abs(base) + 0.25;
      const state = kinematics1D({
        initialPositionMetres: metres(0),
        initialVelocityMetresPerSecond: initialVelocity,
        accelerationMetresPerSecondSquared: acceleration,
        elapsedSeconds: seconds(elapsed),
      });

      expect(state.ok).toBe(true);
      if (state.ok) {
        const left = state.value.velocityMetresPerSecond ** 2;
        const right = initialVelocity ** 2 + 2 * acceleration * state.value.displacementMetres;
        expect(approxEqual(left, right, mechanicsTolerance.loose)).toBe(true);
      }
    }
  });

  it("samples projectile motion with constant horizontal velocity", () => {
    const sample = projectileAt(
      {
        initialPositionMetres: { x: 0, y: 1 },
        initialVelocityMetresPerSecond: { x: 12, y: 8 },
        accelerationMetresPerSecondSquared: { x: 0, y: -9.8 },
      },
      seconds(2),
    );

    expect(sample.ok).toBe(true);
    if (sample.ok) {
      expect(sample.value.positionMetres.x).toBe(24);
      expect(approxEqual(sample.value.positionMetres.y, -2.6, mechanicsTolerance.default)).toBe(true);
      expect(sample.value.velocityMetresPerSecond.x).toBe(12);
      expect(approxEqual(sample.value.velocityMetresPerSecond.y, -11.6, mechanicsTolerance.default)).toBe(true);
    }
  });

  it("sums forces without mutating caller vectors", () => {
    const forces: readonly Vector2[] = [
      { x: 3, y: -2 },
      { x: -1, y: 5 },
      { x: 4, y: 0 },
    ];
    const before = JSON.stringify(forces);
    const result = netForce(forces);

    expect(JSON.stringify(forces)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ x: 6, y: 3 });
  });

  it("applies Newton's second law from net force and mass", () => {
    const result = accelerationFromForce({ x: 10, y: -5 }, kilograms(2.5));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ x: 4, y: -2 });
  });

  it("computes work, kinetic energy, and momentum helpers", () => {
    const work = workDone(newtons(10), metres(3), radians(Math.PI / 3));
    expect(work.ok).toBe(true);
    if (work.ok) expect(approxEqual(work.value, 15, mechanicsTolerance.loose)).toBe(true);

    const energy = kineticEnergy(kilograms(4), metresPerSecond(6));
    expect(energy.ok).toBe(true);
    if (energy.ok) expect(energy.value).toBe(72);

    const momentum = momentum1D(kilograms(4), -6);
    expect(momentum.ok).toBe(true);
    if (momentum.ok) expect(momentum.value).toBe(-24);
  });

  it("computes uniform circular motion requirements", () => {
    const motion = uniformCircularMotion({
      massKilograms: kilograms(2),
      speedMetresPerSecond: metresPerSecond(6),
      radiusMetres: metres(3),
    });

    expect(motion.ok).toBe(true);
    if (motion.ok) {
      expect(motion.value.centripetalAccelerationMetresPerSecondSquared).toBe(12);
      expect(motion.value.centripetalForceNewtons).toBe(24);
      expect(motion.value.angularSpeedRadiansPerSecond).toBe(2);
      expect(approxEqual(motion.value.periodSeconds, Math.PI, mechanicsTolerance.default)).toBe(true);
    }
  });

  it("preserves uniform circular motion formula invariants over seeded positive inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.2, max: 80, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.2, max: 50, noNaN: true, noDefaultInfinity: true }),
        (mass, speed, radius) => {
          const motion = uniformCircularMotion({
            massKilograms: kilograms(mass),
            speedMetresPerSecond: metresPerSecond(speed),
            radiusMetres: metres(radius),
          });

          expect(motion.ok).toBe(true);
          if (!motion.ok) return false;

          const acceleration = (speed * speed) / radius;
          const angularSpeed = speed / radius;

          return (
            approxEqual(
              motion.value.centripetalAccelerationMetresPerSecondSquared,
              acceleration,
              mechanicsTolerance.loose,
            ) &&
            approxEqual(
              motion.value.centripetalForceNewtons,
              mass * acceleration,
              mechanicsTolerance.loose,
            ) &&
            approxEqual(
              motion.value.angularSpeedRadiansPerSecond,
              angularSpeed,
              mechanicsTolerance.loose,
            ) &&
            approxEqual(
              motion.value.periodSeconds,
              (2 * Math.PI) / angularSpeed,
              mechanicsTolerance.loose,
            )
          );
        },
      ),
      { numRuns: 100, seed: 260119 },
    );
  });

  it("computes work-energy transfer and average power helpers", () => {
    const transfer = workEnergyTransfer(joules(2), joules(30));
    expect(transfer.ok).toBe(true);
    if (transfer.ok) {
      expect(transfer.value.finalKineticEnergyJoules).toBe(32);
      expect(transfer.value.kineticEnergyChangeJoules).toBe(30);
    }

    const braking = workEnergyTransfer(joules(4), joules(-24));
    expect(braking.ok).toBe(true);
    if (braking.ok) {
      expect(braking.value.finalKineticEnergyJoules).toBe(0);
      expect(braking.value.kineticEnergyChangeJoules).toBe(-4);
    }

    const power = averagePower(joules(30), seconds(2));
    expect(power.ok).toBe(true);
    if (power.ok) expect(power.value).toBe(15);
  });

  it("computes inverse-square gravitational field quantities", () => {
    const earthMass = kilograms(5.972e24);
    const earthRadius = metres(6.371e6);
    const satelliteMass = kilograms(1000);

    const field = gravitationalFieldStrength({
      sourceMassKilograms: earthMass,
      radiusMetres: earthRadius,
    });
    expect(field.ok).toBe(true);
    if (field.ok) {
      expect(approxEqual(field.value, 9.819973426224687, mechanicsTolerance.loose)).toBe(true);
    }

    const force = gravitationalForce({
      sourceMassKilograms: earthMass,
      testMassKilograms: satelliteMass,
      radiusMetres: earthRadius,
    });
    expect(force.ok).toBe(true);
    if (force.ok && field.ok) {
      expect(approxEqual(force.value, satelliteMass * field.value, mechanicsTolerance.loose)).toBe(true);
    }

    const acceleration = gravitationalAccelerationFromForce({
      sourceMassKilograms: earthMass,
      testMassKilograms: satelliteMass,
      radiusMetres: earthRadius,
    });
    expect(acceleration.ok).toBe(true);
    if (acceleration.ok && field.ok) {
      expect(approxEqual(acceleration.value, field.value, mechanicsTolerance.loose)).toBe(true);
    }

    const potential = gravitationalPotential({
      sourceMassKilograms: earthMass,
      radiusMetres: earthRadius,
    });
    expect(potential.ok).toBe(true);
    if (potential.ok) {
      expect(potential.value).toBeLessThan(0);
      expect(approxEqual(potential.value, -universalGravitationalConstant * earthMass / earthRadius)).toBe(true);
    }

    const energy = gravitationalPotentialEnergy({
      sourceMassKilograms: earthMass,
      testMassKilograms: satelliteMass,
      radiusMetres: earthRadius,
    });
    expect(energy.ok).toBe(true);
    if (energy.ok && potential.ok) {
      expect(approxEqual(energy.value, satelliteMass * potential.value)).toBe(true);
    }
  });

  it("keeps circular orbit speed tied to source mass and radius", () => {
    const speed = circularOrbitSpeed({
      sourceMassKilograms: kilograms(5.972e24),
      radiusMetres: metres(42_164_000),
    });

    expect(speed.ok).toBe(true);
    if (speed.ok) {
      expect(approxEqual(speed.value, 3074.622910711152, mechanicsTolerance.loose)).toBe(true);
    }
  });

  it("samples gravitational ratios and vectors through mechanics", () => {
    const sourceMassKilograms = kilograms(5.972e24);
    const radiusMetres = metres(6.371e6);
    const comparisonRadiusMetres = metres(2 * 6.371e6);

    const ratio = gravitationalFieldStrengthRatio({
      sourceMassKilograms,
      radiusMetres,
      comparisonRadiusMetres,
    });
    expect(ratio.ok).toBe(true);
    if (ratio.ok) expect(approxEqual(ratio.value, 0.25, mechanicsTolerance.default)).toBe(true);

    const scale = gravitationalInverseSquareScale(radiusMetres);
    expect(scale.ok).toBe(true);
    if (scale.ok) expect(approxEqual(scale.value, 1 / (6.371e6 * 6.371e6))).toBe(true);

    const vector = gravitationalFieldVector2D({
      sourceMassKilograms,
      xMetres: radiusMetres,
      yMetres: metres(0),
    });
    expect(vector.ok).toBe(true);
    if (vector.ok) {
      expect(vector.value.x).toBeLessThan(0);
      expect(approxEqual(vector.value.y, 0)).toBe(true);
    }
  });

  it("conserves momentum and kinetic energy in elastic collisions", () => {
    for (const base of deterministicCases(60)) {
      const result = elasticCollision1D({
        mass1Kilograms: kilograms(Math.abs(base) + 1),
        mass2Kilograms: kilograms(Math.abs(base / 2) + 0.75),
        velocity1MetresPerSecond: base * 3,
        velocity2MetresPerSecond: 2 - base,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(approxEqual(
          result.value.totalMomentumAfterKilogramMetresPerSecond,
          result.value.totalMomentumBeforeKilogramMetresPerSecond,
          mechanicsTolerance.loose,
        )).toBe(true);
        expect(approxEqual(
          result.value.totalKineticEnergyAfterJoules,
          result.value.totalKineticEnergyBeforeJoules,
          mechanicsTolerance.loose,
        )).toBe(true);
      }
    }
  });

  it("samples undamped simple harmonic motion", () => {
    const sample = simpleHarmonicMotion(
      {
        equilibriumMetres: metres(1),
        amplitudeMetres: metres(2),
        angularFrequencyRadiansPerSecond: radiansPerSecond(3),
        phaseRadians: radians(0),
      },
      seconds(Math.PI / 6),
    );

    expect(sample.ok).toBe(true);
    if (sample.ok) {
      expect(approxEqual(sample.value.positionMetres, 1, mechanicsTolerance.default)).toBe(true);
      expect(approxEqual(sample.value.displacementFromEquilibriumMetres, 0, mechanicsTolerance.default)).toBe(true);
      expect(approxEqual(sample.value.velocityMetresPerSecond, -6, mechanicsTolerance.default)).toBe(true);
      expect(approxEqual(sample.value.accelerationMetresPerSecondSquared, 0, mechanicsTolerance.loose)).toBe(true);
    }
  });

  it("keeps mass-spring period independent of amplitude", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 10, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 120, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 2, noDefaultInfinity: true, noNaN: true }),
        (mass, stiffness, amplitudeA, amplitudeB) => {
          const first = springOscillator(
            {
              massKilograms: kilograms(mass),
              springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
              amplitudeMetres: metres(amplitudeA),
              phaseRadians: radians(0),
            },
            seconds(0),
          );
          const second = springOscillator(
            {
              massKilograms: kilograms(mass),
              springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
              amplitudeMetres: metres(amplitudeB),
              phaseRadians: radians(0),
            },
            seconds(0),
          );

          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) return;
          expect(approxEqual(first.value.periodSeconds, second.value.periodSeconds, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521 },
    );
  });

  it("scales mass-spring total energy with amplitude squared", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 10, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 120, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.05, max: 2, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.2, max: 3, noDefaultInfinity: true, noNaN: true }),
        (mass, stiffness, amplitude, scaleFactor) => {
          const first = springOscillator(
            {
              massKilograms: kilograms(mass),
              springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
              amplitudeMetres: metres(amplitude),
              phaseRadians: radians(0),
            },
            seconds(0),
          );
          const scaled = springOscillator(
            {
              massKilograms: kilograms(mass),
              springConstantNewtonsPerMetre: newtonsPerMetre(stiffness),
              amplitudeMetres: metres(amplitude * scaleFactor),
              phaseRadians: radians(0),
            },
            seconds(0),
          );

          expect(first.ok).toBe(true);
          expect(scaled.ok).toBe(true);
          if (!first.ok || !scaled.ok) return;
          expect(
            approxEqual(
              scaled.value.totalEnergyJoules,
              first.value.totalEnergyJoules * scaleFactor * scaleFactor,
              mechanicsTolerance.loose,
            ),
          ).toBe(true);
        },
      ),
      { seed: 20260522 },
    );
  });

  it("rejects invalid preconditions as KernelResult errors", () => {
    const negativeTime = projectileAt(
      {
        initialPositionMetres: { x: 0, y: 0 },
        initialVelocityMetresPerSecond: { x: 1, y: 1 },
        accelerationMetresPerSecondSquared: { x: 0, y: -9.8 },
      },
      seconds(-1),
    );
    expect(negativeTime.ok).toBe(false);
    if (!negativeTime.ok) expect(negativeTime.error.code).toBe("precondition-violated");

    const zeroMass = accelerationFromForce({ x: 1, y: 1 }, kilograms(0));
    expect(zeroMass.ok).toBe(false);
    if (!zeroMass.ok) expect(zeroMass.error.code).toBe("precondition-violated");

    const zeroRadius = uniformCircularMotion({
      massKilograms: kilograms(1),
      speedMetresPerSecond: metresPerSecond(2),
      radiusMetres: metres(0),
    });
    expect(zeroRadius.ok).toBe(false);
    if (!zeroRadius.ok) expect(zeroRadius.error.code).toBe("precondition-violated");

    const invalidForce = netForce([{ x: Number.NaN, y: 0 }]);
    expect(invalidForce.ok).toBe(false);
    if (!invalidForce.ok) expect(invalidForce.error.code).toBe("precondition-violated");

    const invalidGravity = gravitationalFieldStrength({
      sourceMassKilograms: kilograms(5.972e24),
      radiusMetres: metres(0),
    });
    expect(invalidGravity.ok).toBe(false);
    if (!invalidGravity.ok) expect(invalidGravity.error.code).toBe("precondition-violated");
  });

  it("rejects elastic collision outputs that overflow from finite inputs", () => {
    const result = elasticCollision1D({
      mass1Kilograms: kilograms(Number.MAX_VALUE),
      mass2Kilograms: kilograms(Number.MAX_VALUE),
      velocity1MetresPerSecond: 1,
      velocity2MetresPerSecond: -1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
  });

  it("rejects scalar helper outputs that overflow from finite inputs", () => {
    const kinematics = kinematics1D({
      initialPositionMetres: metres(Number.MAX_VALUE),
      initialVelocityMetresPerSecond: Number.MAX_VALUE,
      accelerationMetresPerSecondSquared: 0,
      elapsedSeconds: seconds(1),
    });
    expect(kinematics.ok).toBe(false);
    if (!kinematics.ok) expect(kinematics.error.code).toBe("numerical-instability");

    const work = workDone(newtons(Number.MAX_VALUE), metres(2));
    expect(work.ok).toBe(false);
    if (!work.ok) expect(work.error.code).toBe("numerical-instability");

    const energy = kineticEnergy(kilograms(Number.MAX_VALUE), metresPerSecond(2));
    expect(energy.ok).toBe(false);
    if (!energy.ok) expect(energy.error.code).toBe("numerical-instability");

    const momentum = momentum1D(kilograms(Number.MAX_VALUE), 2);
    expect(momentum.ok).toBe(false);
    if (!momentum.ok) expect(momentum.error.code).toBe("numerical-instability");

    const transfer = workEnergyTransfer(joules(Number.MAX_VALUE), joules(Number.MAX_VALUE));
    expect(transfer.ok).toBe(false);
    if (!transfer.ok) expect(transfer.error.code).toBe("numerical-instability");

    const power = averagePower(joules(Number.MAX_VALUE), seconds(Number.MIN_VALUE));
    expect(power.ok).toBe(false);
    if (!power.ok) expect(power.error.code).toBe("numerical-instability");
  });
});
