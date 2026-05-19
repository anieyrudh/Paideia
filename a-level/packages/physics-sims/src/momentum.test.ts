// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  approxEqual,
  kilograms,
  metresPerSecond,
} from "@paideia/shared";
import { momentumModel } from "./momentum.js";
import { runMomentumGateContract } from "./momentum.contract.js";

describe("momentum sim", () => {
  it("conserves total momentum across an elastic collision", () => {
    const model = momentumModel({
      massAKilograms: kilograms(0.5),
      massBKilograms: kilograms(1),
      velocityAMetresPerSecond: metresPerSecond(2),
      velocityBMetresPerSecond: metresPerSecond(-0.5),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.totalInitialMomentum, 0.5)).toBe(true);
    expect(approxEqual(model.value.totalFinalMomentum, 0.5)).toBe(true);
    expect(approxEqual(model.value.finalVelocityA, -4 / 3)).toBe(true);
    expect(approxEqual(model.value.finalVelocityB, 7 / 6)).toBe(true);
  });

  it("shows equal and opposite impulses on the two carts", () => {
    const model = momentumModel({
      massAKilograms: kilograms(1),
      massBKilograms: kilograms(1.5),
      velocityAMetresPerSecond: metresPerSecond(3),
      velocityBMetresPerSecond: metresPerSecond(-1),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.impulseOnA + model.value.impulseOnB, 0)).toBe(true);
  });

  it("rejects invalid mass through the KernelResult error contract", () => {
    const model = momentumModel({
      massAKilograms: kilograms(0),
      massBKilograms: kilograms(1),
      velocityAMetresPerSecond: metresPerSecond(2),
      velocityBMetresPerSecond: metresPerSecond(-0.5),
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });
});

runMomentumGateContract();
