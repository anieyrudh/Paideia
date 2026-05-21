import { describe, expect, it } from "vitest";
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
  elasticCollision1D,
  kineticEnergy,
  kinematics1D,
  mechanicsTolerance,
  momentum1D,
  netForce,
  projectileAt,
  simpleHarmonicMotion,
  springOscillator,
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

  it("models a mass-spring oscillator without amplitude changing ideal period", () => {
    const first = springOscillator(
      {
        massKilograms: kilograms(2),
        springConstantNewtonsPerMetre: newtonsPerMetre(32),
        amplitudeMetres: metres(0.8),
        phaseRadians: radians(0),
      },
      seconds(0),
    );
    const largerAmplitude = springOscillator(
      {
        massKilograms: kilograms(2),
        springConstantNewtonsPerMetre: newtonsPerMetre(32),
        amplitudeMetres: metres(1.6),
        phaseRadians: radians(0),
      },
      seconds(0),
    );

    expect(first.ok).toBe(true);
    expect(largerAmplitude.ok).toBe(true);
    if (first.ok && largerAmplitude.ok) {
      expect(approxEqual(first.value.angularFrequencyRadiansPerSecond, 4)).toBe(true);
      expect(approxEqual(first.value.periodSeconds, Math.PI / 2)).toBe(true);
      expect(approxEqual(first.value.frequencyHertz, 2 / Math.PI)).toBe(true);
      expect(approxEqual(first.value.accelerationMetresPerSecondSquared, -12.8)).toBe(true);
      expect(approxEqual(first.value.totalEnergyJoules, 10.24)).toBe(true);
      expect(approxEqual(first.value.periodSeconds, largerAmplitude.value.periodSeconds)).toBe(true);
      expect(approxEqual(largerAmplitude.value.totalEnergyJoules, first.value.totalEnergyJoules * 4)).toBe(true);
    }
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

    const invalidForce = netForce([{ x: Number.NaN, y: 0 }]);
    expect(invalidForce.ok).toBe(false);
    if (!invalidForce.ok) expect(invalidForce.error.code).toBe("precondition-violated");
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
