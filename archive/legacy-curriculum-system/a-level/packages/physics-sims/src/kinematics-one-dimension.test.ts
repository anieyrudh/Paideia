// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual, metres, seconds } from "@paideia/shared";
import {
  kinematicsModel,
  metresPerSecond,
  metresPerSecondSquared,
} from "./kinematics-one-dimension.js";
import { runKinematicsGateContract } from "./kinematics-one-dimension.contract.js";

describe("kinematics-one-dimension sim", () => {
  it("computes constant-acceleration displacement and final velocity through core mechanics", () => {
    const model = kinematicsModel({
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(0),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(2),
      elapsedSeconds: seconds(3),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.displacementMetres, 9)).toBe(true);
    expect(approxEqual(model.value.velocityMetresPerSecond, 6)).toBe(true);
    expect(approxEqual(model.value.velocityAreaMetres, 9)).toBe(true);
    expect(model.value.samplePoints.length).toBe(25);
  });

  it("supports negative acceleration without changing the sign convention", () => {
    const model = kinematicsModel({
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(8),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(-1.5),
      elapsedSeconds: seconds(5),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.displacementMetres, 21.25)).toBe(true);
    expect(approxEqual(model.value.velocityMetresPerSecond, 0.5)).toBe(true);
    expect(approxEqual(model.value.velocityAreaMetres, model.value.displacementMetres)).toBe(true);
  });

  it("preserves signed displacement after a direction change", () => {
    const model = kinematicsModel({
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(2),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(-3),
      elapsedSeconds: seconds(2),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.displacementMetres, -2)).toBe(true);
    expect(approxEqual(model.value.velocityMetresPerSecond, -4)).toBe(true);
    expect(approxEqual(model.value.velocityAreaMetres, model.value.displacementMetres)).toBe(true);
    expect(model.value.samplePoints.some((point) => point.displacementMetres < 0)).toBe(true);
  });

  it("rejects invalid time through the core mechanics error contract", () => {
    const model = kinematicsModel({
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(0),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(2),
      elapsedSeconds: seconds(Number.NaN),
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });
});

runKinematicsGateContract();
