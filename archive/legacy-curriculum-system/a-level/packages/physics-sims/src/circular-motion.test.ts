// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  approxEqual,
  degrees,
  kilograms,
  metres,
  metresPerSecond,
} from "@paideia/shared";
import { circularMotionModel } from "./circular-motion.js";
import { runCircularMotionGateContract } from "./circular-motion.contract.js";

describe("circular motion sim", () => {
  it("computes acceleration, force, angular speed, and period from the kernel", () => {
    const model = circularMotionModel({
      massKilograms: kilograms(1.2),
      speedMetresPerSecond: metresPerSecond(6),
      radiusMetres: metres(4),
      angleDegrees: degrees(45),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.centripetalAccelerationMetresPerSecondSquared, 9, 1e-9)).toBe(
      true,
    );
    expect(approxEqual(model.value.centripetalForceNewtons, 10.8)).toBe(true);
    expect(approxEqual(model.value.angularSpeedRadiansPerSecond, 1.5, 1e-9)).toBe(true);
    expect(approxEqual(model.value.periodSeconds, (2 * Math.PI * 4) / 6)).toBe(true);
  });

  it("shows quadratic force growth when speed changes", () => {
    const baseline = circularMotionModel({
      massKilograms: kilograms(1),
      speedMetresPerSecond: metresPerSecond(3),
      radiusMetres: metres(3),
      angleDegrees: degrees(0),
    });
    const faster = circularMotionModel({
      massKilograms: kilograms(1),
      speedMetresPerSecond: metresPerSecond(6),
      radiusMetres: metres(3),
      angleDegrees: degrees(0),
    });

    expect(baseline.ok).toBe(true);
    expect(faster.ok).toBe(true);
    if (baseline.ok && faster.ok) {
      expect(faster.value.centripetalForceNewtons).toBe(
        4 * baseline.value.centripetalForceNewtons,
      );
    }
  });

  it("preserves circular-motion invariants over seeded learner-state inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 3, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 12, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 360, noNaN: true, noDefaultInfinity: true }),
        (mass, speed, radius, angle) => {
          const model = circularMotionModel({
            massKilograms: kilograms(mass),
            speedMetresPerSecond: metresPerSecond(speed),
            radiusMetres: metres(radius),
            angleDegrees: degrees(angle),
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return false;

          const acceleration = (speed * speed) / radius;
          const angularSpeed = speed / radius;
          const doubledSpeed = circularMotionModel({
            massKilograms: kilograms(mass),
            speedMetresPerSecond: metresPerSecond(speed * 2),
            radiusMetres: metres(radius),
            angleDegrees: degrees(angle),
          });

          expect(doubledSpeed.ok).toBe(true);
          if (!doubledSpeed.ok) return false;

          return (
            approxEqual(
              model.value.centripetalAccelerationMetresPerSecondSquared,
              acceleration,
              1e-6,
            ) &&
            approxEqual(
              model.value.periodSeconds,
              (2 * Math.PI) / angularSpeed,
              1e-6,
            ) &&
            approxEqual(
              doubledSpeed.value.centripetalForceNewtons,
              4 * model.value.centripetalForceNewtons,
              1e-6,
            )
          );
        },
      ),
      { numRuns: 100, seed: 260119 },
    );
  });

  it("rejects invalid radius through the KernelResult error contract", () => {
    const model = circularMotionModel({
      massKilograms: kilograms(1),
      speedMetresPerSecond: metresPerSecond(4),
      radiusMetres: metres(0),
      angleDegrees: degrees(0),
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });
});

runCircularMotionGateContract();
