import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  filterEvidence,
  signalFilterFrequencyResponsePackageId,
  type FilterState,
} from "./signal-filter-frequency-response.js";

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

const baseLowPass: FilterState = {
  mode: "low-pass",
  resistanceKiloOhms: 10,
  capacitanceMicroFarads: 0.01,
  probeFrequencyHertz: 1600,
};

describe("signal filter frequency response", () => {
  it("keeps filter response evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(
      signalFilterFrequencyResponsePackageId,
      "signal-filter-frequency-response",
    );

    expect(
      isRevealed(signalFilterFrequencyResponsePackageId, "signal-filter-frequency-response"),
    ).toBe(false);

    const committed = commitPrediction(
      signalFilterFrequencyResponsePackageId,
      "signal-filter-frequency-response",
      {
        value: "The output is about 0.707 of the input and the phase has already shifted",
        rationale: "Cutoff is the -3 dB point, not an on/off deletion point.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(
      isRevealed(signalFilterFrequencyResponsePackageId, "signal-filter-frequency-response"),
    ).toBe(true);
  });

  it("computes the one-pole cutoff and -3 dB response from the control kernel", () => {
    const evidence = filterEvidence(baseLowPass);

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error("Expected filter evidence");
    expect(evidence.value.cutoffHertz).toBeGreaterThan(1500);
    expect(evidence.value.cutoffHertz).toBeLessThan(1700);
    expect(evidence.value.cutoffPoint.magnitude).toBeCloseTo(1 / Math.sqrt(2), 3);
    expect(evidence.value.cutoffPoint.magnitudeDb).toBeCloseTo(-3.01, 1);
    expect(evidence.value.cutoffPoint.phaseDeg).toBeCloseTo(-45, 1);
  });

  it("shows attenuation is gradual rather than an instant cutoff", () => {
    const evidence = filterEvidence({
      ...baseLowPass,
      probeFrequencyHertz: 16000,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error("Expected filter evidence");
    expect(evidence.value.probe.magnitude).toBeGreaterThan(0.08);
    expect(evidence.value.probe.magnitude).toBeLessThan(0.12);
    expect(evidence.value.probe.magnitudeDb).toBeGreaterThan(-22);
  });

  it("uses the circuit phasor kernel for probe current and impedance", () => {
    const lowPass = filterEvidence(baseLowPass);
    const higherCapacitance = filterEvidence({
      ...baseLowPass,
      capacitanceMicroFarads: 0.05,
    });

    expect(lowPass.ok).toBe(true);
    expect(higherCapacitance.ok).toBe(true);
    if (!lowPass.ok || !higherCapacitance.ok) throw new Error("Expected filter evidence");
    expect(lowPass.value.circuit.seriesImpedanceOhms).toBeGreaterThan(10000);
    expect(higherCapacitance.value.cutoffHertz).toBeLessThan(lowPass.value.cutoffHertz);
    expect(higherCapacitance.value.probe.magnitudeDb).toBeLessThan(
      lowPass.value.probe.magnitudeDb,
    );
  });
});
