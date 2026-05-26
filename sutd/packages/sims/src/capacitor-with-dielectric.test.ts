import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  capacitorWithDielectricPackageId,
  dielectricCapacitorEvidence,
} from "./capacitor-with-dielectric.js";

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

describe("capacitor with dielectric sim", () => {
  it("keeps dielectric evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(capacitorWithDielectricPackageId, "capacitor-with-dielectric");

    expect(isRevealed(capacitorWithDielectricPackageId, "capacitor-with-dielectric")).toBe(false);
    const committed = commitPrediction(
      capacitorWithDielectricPackageId,
      "capacitor-with-dielectric",
      {
        rationale: "At fixed voltage, a larger dielectric constant increases C, so Q and U rise.",
        value:
          "Both capacitance and stored energy increase in proportion to the dielectric constant.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(capacitorWithDielectricPackageId, "capacitor-with-dielectric")).toBe(true);
  });

  it("computes capacitance, charge, energy, and field for default settings", () => {
    const evidence = dielectricCapacitorEvidence({
      dielectricConstant: 3,
      plateAreaSquareCentimetres: 80,
      plateSeparationMillimetres: 1,
      voltageVolts: 12,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(approxEqual(evidence.value.model.capacitanceFarads, 2.125005075072e-10, 1e-21)).toBe(true);
    expect(approxEqual(evidence.value.model.chargeCoulombs, 2.5500060900864e-9, 1e-20)).toBe(true);
    expect(approxEqual(evidence.value.model.energyJoules, 1.53000365405184e-8, 1e-19)).toBe(true);
    expect(approxEqual(evidence.value.model.electricFieldVoltsPerMetre, 12000, 1e-9)).toBe(true);
  });

  it("scales linearly with dielectric constant at fixed geometry and voltage", () => {
    const air = dielectricCapacitorEvidence({
      dielectricConstant: 1,
      plateAreaSquareCentimetres: 80,
      plateSeparationMillimetres: 1,
      voltageVolts: 12,
    });
    const ceramic = dielectricCapacitorEvidence({
      dielectricConstant: 6,
      plateAreaSquareCentimetres: 80,
      plateSeparationMillimetres: 1,
      voltageVolts: 12,
    });

    expect(air.ok).toBe(true);
    expect(ceramic.ok).toBe(true);
    if (!air.ok || !ceramic.ok) throw new Error("Expected valid capacitor evidence.");
    expect(approxEqual(ceramic.value.model.capacitanceFarads / air.value.model.capacitanceFarads, 6, 1e-12)).toBe(true);
    expect(approxEqual(ceramic.value.model.energyJoules / air.value.model.energyJoules, 6, 1e-12)).toBe(true);
  });
});
