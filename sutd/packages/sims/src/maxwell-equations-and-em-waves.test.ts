import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  maxwellEquationsAndEmWavesPackageId,
  maxwellEvidence,
} from "./maxwell-equations-and-em-waves.js";

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

describe("Maxwell equations and EM waves sim", () => {
  it("keeps wave evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(maxwellEquationsAndEmWavesPackageId, "maxwell-equations-and-em-waves");

    expect(isRevealed(maxwellEquationsAndEmWavesPackageId, "maxwell-equations-and-em-waves")).toBe(false);
    const committed = commitPrediction(maxwellEquationsAndEmWavesPackageId, "maxwell-equations-and-em-waves", {
      rationale: "A changing electric field sustains magnetic circulation.",
      value: "It sustains a changing magnetic field, allowing a transverse electromagnetic wave to propagate.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(maxwellEquationsAndEmWavesPackageId, "maxwell-equations-and-em-waves")).toBe(true);
  });

  it("computes the default visible-light wave state", () => {
    const evidence = maxwellEvidence({
      electricFieldVoltsPerMetre: 12,
      frequencyTeraHertz: 600,
      relativePermeability: 1,
      relativePermittivity: 1,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(evidence.value.model.spectrumBand).toBe("visible");
    expect(approxEqual(evidence.value.model.wavelengthMetres, 4.996540966666667e-7, 1e-12)).toBe(true);
    expect(evidence.value.model.interpretation).toContain("transverse visible wave");
  });
});
