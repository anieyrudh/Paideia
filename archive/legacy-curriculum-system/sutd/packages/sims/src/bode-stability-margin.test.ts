import {
  multiplyTransferFunctions,
  stabilityMargins,
  transferFunction,
  type TransferFunction,
} from "@paideia/control-systems";
import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import type { KernelResult } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import { bodeStabilityMarginPackageId } from "./bode-stability-margin.js";

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

const openLoop = (
  loopGain: number,
  actuatorLagSeconds: number,
  sensorLagSeconds: number,
): KernelResult<TransferFunction> => {
  const gain = transferFunction([loopGain], [1]);
  if (!gain.ok) return gain;
  const integrator = transferFunction([1], [1, 0]);
  if (!integrator.ok) return integrator;
  const actuatorLag = transferFunction([1], [actuatorLagSeconds, 1]);
  if (!actuatorLag.ok) return actuatorLag;
  const sensorLag = transferFunction([1], [sensorLagSeconds, 1]);
  if (!sensorLag.ok) return sensorLag;

  const plant = multiplyTransferFunctions(integrator.value, actuatorLag.value);
  if (!plant.ok) return plant;
  const loopWithoutGain = multiplyTransferFunctions(plant.value, sensorLag.value);
  if (!loopWithoutGain.ok) return loopWithoutGain;
  return multiplyTransferFunctions(gain.value, loopWithoutGain.value);
};

describe("bode stability margin evidence", () => {
  it("keeps margin evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(bodeStabilityMarginPackageId, "bode-stability-margin");

    expect(isRevealed(bodeStabilityMarginPackageId, "bode-stability-margin")).toBe(false);
    const committed = commitPrediction(
      bodeStabilityMarginPackageId,
      "bode-stability-margin",
      {
        value: "The phase margin decreases because crossover moves to a higher-lag frequency",
        rationale: "Higher gain moves the gain crossover to a frequency with more phase lag.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(bodeStabilityMarginPackageId, "bode-stability-margin")).toBe(true);
  });

  it("reads a modest positive default phase margin", () => {
    const system = openLoop(2, 0.7, 0.25);
    expect(system.ok).toBe(true);
    if (!system.ok) throw new Error("Expected transfer function");
    const evidence = stabilityMargins(system.value);

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.gainCrossover?.frequencyRadPerSec).toBeGreaterThan(1);
      expect(evidence.value.phaseMarginDeg).toBeGreaterThan(25);
      expect(evidence.value.gainMarginDb).toBeGreaterThan(8);
    }
  });

  it("shows doubled gain reduces margin", () => {
    const saferSystem = openLoop(2, 0.7, 0.25);
    const aggressiveSystem = openLoop(4, 0.7, 0.25);

    expect(saferSystem.ok).toBe(true);
    expect(aggressiveSystem.ok).toBe(true);
    if (!saferSystem.ok || !aggressiveSystem.ok) throw new Error("Expected transfer functions");
    const safer = stabilityMargins(saferSystem.value);
    const aggressive = stabilityMargins(aggressiveSystem.value);

    expect(safer.ok).toBe(true);
    expect(aggressive.ok).toBe(true);
    if (safer.ok && aggressive.ok) {
      expect(aggressive.value.phaseMarginDeg ?? 0).toBeLessThan(
        safer.value.phaseMarginDeg ?? 0,
      );
    }
  });
});
