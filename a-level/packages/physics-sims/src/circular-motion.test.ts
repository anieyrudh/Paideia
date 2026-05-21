// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
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
    expect(model.value.centripetalAccelerationMetresPerSecondSquared).toBe(9);
    expect(approxEqual(model.value.centripetalForceNewtons, 10.8)).toBe(true);
    expect(model.value.angularSpeedRadiansPerSecond).toBe(1.5);
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
