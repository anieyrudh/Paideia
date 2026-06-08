import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import { rlcCircuitAndResonancePackageId, rlcEvidence } from "./rlc-circuit-and-resonance.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const installStorage = (): void => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
};

describe("RLC circuit and resonance sim", () => {
  it("keeps resonance evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(rlcCircuitAndResonancePackageId, "rlc-circuit-and-resonance");

    expect(isRevealed(rlcCircuitAndResonancePackageId, "rlc-circuit-and-resonance")).toBe(false);
    const committed = commitPrediction(rlcCircuitAndResonancePackageId, "rlc-circuit-and-resonance", {
      rationale: "At resonance reactance cancels but resistance remains.",
      value: "Net reactance is near zero, so impedance is mostly resistance and current is largest.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(rlcCircuitAndResonancePackageId, "rlc-circuit-and-resonance")).toBe(true);
  });

  it("computes the default near-resonance state", () => {
    const evidence = rlcEvidence({
      capacitanceMicroFarads: 100,
      frequencyHertz: 50,
      inductanceMilliHenrys: 100,
      resistanceOhms: 20,
      sourceVoltageRmsVolts: 10,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(approxEqual(evidence.value.model.resonantFrequencyHertz, 50.32921210448704, 1e-9)).toBe(true);
    expect(approxEqual(evidence.value.model.currentRmsAmps, 0.4998923619351425, 1e-9)).toBe(true);
    expect(evidence.value.model.interpretation).toContain("near resonance");
  });
});
