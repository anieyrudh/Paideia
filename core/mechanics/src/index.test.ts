import { describe, expect, it } from "vitest";
import { kilograms, metres, newtons, radians, seconds } from "@paideia/shared";
import {
  accelerationFromForce,
  elasticCollision1D,
  kineticEnergy,
  kinematics1D,
  mechanicsTolerance,
  momentum1D,
  netForce,
  projectileAt,
  simpleHarmonicMotion,
  workDone,
  type Vector2,
} from "./index.js";

const expectClose = (
  actual: number,
  expected: number,
  tolerance: number = mechanicsTolerance.default,
) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

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
        expectClose(left, right, mechanicsTolerance.loose);
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
      expectClose(sample.value.positionMetres.y, -2.6);
      expect(sample.value.velocityMetresPerSecond.x).toBe(12);
      expectClose(sample.value.velocityMetresPerSecond.y, -11.6);
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
    if (work.ok) expectClose(work.value, 15, mechanicsTolerance.loose);

    const energy = kineticEnergy(kilograms(4), 6);
    expect(energy.ok).toBe(true);
    if (energy.ok) expect(energy.value).toBe(72);

    const momentum = momentum1D(kilograms(4), -6);
    expect(momentum.ok).toBe(true);
    if (momentum.ok) expect(momentum.value).toBe(-24);
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
        expectClose(
          result.value.totalMomentumAfterKilogramMetresPerSecond,
          result.value.totalMomentumBeforeKilogramMetresPerSecond,
          mechanicsTolerance.loose,
        );
        expectClose(
          result.value.totalKineticEnergyAfterJoules,
          result.value.totalKineticEnergyBeforeJoules,
          mechanicsTolerance.loose,
        );
      }
    }
  });

  it("samples undamped simple harmonic motion", () => {
    const sample = simpleHarmonicMotion(
      {
        equilibriumMetres: metres(1),
        amplitudeMetres: metres(2),
        angularFrequencyRadiansPerSecond: 3,
        phaseRadians: radians(0),
      },
      seconds(Math.PI / 6),
    );

    expect(sample.ok).toBe(true);
    if (sample.ok) {
      expectClose(sample.value.positionMetres, 1);
      expectClose(sample.value.displacementFromEquilibriumMetres, 0);
      expectClose(sample.value.velocityMetresPerSecond, -6);
      expectClose(sample.value.accelerationMetresPerSecondSquared, 0, mechanicsTolerance.loose);
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
});
