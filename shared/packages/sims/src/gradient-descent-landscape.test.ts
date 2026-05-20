// @vitest-environment jsdom

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import {
  buildGradientDescentModel,
  defaultGradientDescentState,
  type GradientDescentState,
} from "./gradient-descent-landscape.js";

describe("gradient-descent-landscape sim model", () => {
  const tolerance = 0.2;

  it("uses the optimization kernel to converge on the smooth bowl", () => {
    const result = buildGradientDescentModel({
      landscape: "bowl",
      startX: 3.2,
      startY: 2.4,
      learningRate: 0.18,
      maxSteps: 40,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approxEqual(result.value.finalSample.point[0], 1, tolerance)).toBe(true);
    expect(approxEqual(result.value.finalSample.point[1], -1, tolerance)).toBe(true);
    expect(result.value.finalSample.value).toBeLessThan(0.25);
  });

  it("shows that an oversized ravine learning rate can leave the domain", () => {
    const state: GradientDescentState = {
      ...defaultGradientDescentState,
      learningRate: 0.75,
      maxSteps: 12,
    };
    const result = buildGradientDescentModel(state);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.trace.reason).toBe("out-of-domain");
    expect(result.value.interpretation).toContain("unstable");
  });

  it("reduces smooth-bowl loss across generated starting points", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3.5, max: 3.5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: -3.5, max: 3.5, noDefaultInfinity: true, noNaN: true }),
        fc.integer({ min: 12, max: 24 }),
        fc.integer({ min: 36, max: 60 }),
        (startX, startY, learningRatePercent, maxSteps) => {
          const state: GradientDescentState = {
            landscape: "bowl",
            startX,
            startY,
            learningRate: learningRatePercent / 100,
            maxSteps,
          };
          const result = buildGradientDescentModel(state);
          expect(result.ok).toBe(true);
          if (!result.ok) return;

          expect(result.value.finalSample.value).toBeLessThanOrEqual(
            result.value.trace.initial.value,
          );
          expect(Number.isFinite(result.value.finalSample.point[0])).toBe(true);
          expect(Number.isFinite(result.value.finalSample.point[1])).toBe(true);
        },
      ),
      { seed: 112, numRuns: 50 },
    );
  });

  it("classifies oversized ravine steps as unstable across generated rates", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 55, max: 75 }),
        fc.integer({ min: 8, max: 16 }),
        (learningRatePercent, maxSteps) => {
          const result = buildGradientDescentModel({
            ...defaultGradientDescentState,
            learningRate: learningRatePercent / 100,
            maxSteps,
          });

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.trace.reason).toBe("out-of-domain");
          expect(result.value.interpretation).toContain("unstable");
        },
      ),
      { seed: 112, numRuns: 25 },
    );
  });
});
