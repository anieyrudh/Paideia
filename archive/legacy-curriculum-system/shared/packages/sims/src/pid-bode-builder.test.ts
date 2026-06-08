// @vitest-environment jsdom

import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  pidBodeBuilderPackageId,
  pidBodeEvidence,
  type PidBodeState,
} from "./pid-bode-builder.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const installStorage = (): void => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
};

const defaultState: PidBodeState = {
  kp: 1.4,
  ki: 0.7,
  kd: 0.18,
  naturalFrequencyRadPerSec: 2.5,
  dampingRatio: 0.45,
};

describe("pid-bode-builder sim evidence", () => {
  it("keeps evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(pidBodeBuilderPackageId, "pid-bode-builder");

    expect(isRevealed(pidBodeBuilderPackageId, "pid-bode-builder")).toBe(false);
    const committed = commitPrediction(pidBodeBuilderPackageId, "pid-bode-builder", {
      value: "The response can get faster, but the phase margin may shrink.",
      rationale: "More proportional gain can move crossover to a frequency with more lag.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(pidBodeBuilderPackageId, "pid-bode-builder")).toBe(true);
  });

  it("computes step and Bode evidence from control-system kernels", () => {
    const evidence = pidBodeEvidence(defaultState);

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;
    expect(evidence.value.stepSamples.length).toBeGreaterThan(100);
    expect(evidence.value.bodePoints.length).toBeGreaterThan(40);
    expect(evidence.value.overshootPercent).toBeGreaterThanOrEqual(0);
    expect(evidence.value.phaseMarginDeg ?? 0).toBeGreaterThan(0);
    expect(evidence.value.gainCrossover?.frequencyRadPerSec ?? 0).toBeGreaterThan(0);
  });

  it("shows aggressive proportional gain increases overshoot risk", () => {
    const balanced = pidBodeEvidence(defaultState);
    const aggressive = pidBodeEvidence({ ...defaultState, kp: 3.2 });

    expect(balanced.ok).toBe(true);
    expect(aggressive.ok).toBe(true);
    if (!balanced.ok || !aggressive.ok) return;
    expect(aggressive.value.overshootPercent).toBeGreaterThan(
      balanced.value.overshootPercent,
    );
  });
});
