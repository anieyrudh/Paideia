// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { projectileMotionModel } from "./projectile-motion.js";
import { runProjectileMotionGateContract } from "./projectile-motion.contract.js";

describe("projectile-motion sim", () => {
  it("computes horizontal launch from a height through core mechanics", () => {
    const model = projectileMotionModel({
      launchSpeedMetresPerSecond: 14,
      launchAngleDegrees: 0,
      launchHeightMetres: 6,
      gravityMetresPerSecondSquared: 9.81,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.initialVelocityMetresPerSecond.x, 14)).toBe(true);
    expect(approxEqual(model.value.initialVelocityMetresPerSecond.y, 0)).toBe(true);
    expect(model.value.flightTimeSeconds).toBeGreaterThan(1.1);
    expect(model.value.flightTimeSeconds).toBeLessThan(1.2);
    expect(model.value.rangeMetres).toBeGreaterThan(15);
    expect(model.value.rangeMetres).toBeLessThan(16);
    expect(model.value.trace.length).toBe(37);
  });

  it("keeps horizontal acceleration zero while vertical acceleration is gravity", () => {
    const model = projectileMotionModel({
      launchSpeedMetresPerSecond: 18,
      launchAngleDegrees: 35,
      launchHeightMetres: 2,
      gravityMetresPerSecondSquared: 9.81,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.accelerationMetresPerSecondSquared.x, 0)).toBe(true);
    expect(approxEqual(model.value.accelerationMetresPerSecondSquared.y, -9.81)).toBe(true);
    expect(model.value.peakHeightMetres).toBeGreaterThan(7);
    expect(model.value.rangeMetres).toBeGreaterThan(33);
  });

  it("clamps out-of-range UI state before evaluating the projectile", () => {
    const model = projectileMotionModel({
      launchSpeedMetresPerSecond: 300,
      launchAngleDegrees: -40,
      launchHeightMetres: -12,
      gravityMetresPerSecondSquared: 0,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(model.value.initialVelocityMetresPerSecond.x).toBe(30);
    expect(model.value.initialVelocityMetresPerSecond.y).toBe(0);
    expect(model.value.flightTimeSeconds).toBe(0);
  });
});

runProjectileMotionGateContract();
