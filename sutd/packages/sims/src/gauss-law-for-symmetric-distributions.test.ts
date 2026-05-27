import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  gaussLawEvidence,
  gaussLawPackageId,
  type GaussLawState,
} from "./gauss-law-for-symmetric-distributions.js";

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

const defaultState: GaussLawState = {
  enclosedChargeNanoCoulombs: 3.2,
  faceAreaSquareMetres: 0.4,
  lengthMetres: 1.5,
  linearChargeDensityNanoCoulombsPerMetre: 2,
  radiusMetres: 0.45,
  surfaceChargeDensityNanoCoulombsPerSquareMetre: 1.8,
  symmetry: "spherical",
};

describe("gauss law flux surface lab", () => {
  it("keeps flux evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(gaussLawPackageId, "gauss-law-flux-surface-lab");

    expect(isRevealed(gaussLawPackageId, "gauss-law-flux-surface-lab")).toBe(false);
    const committed = commitPrediction(gaussLawPackageId, "gauss-law-flux-surface-lab", {
      rationale: "Flux through a closed surface depends on enclosed charge, not radius.",
      value: "The total flux stays the same because it depends only on enclosed charge.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(gaussLawPackageId, "gauss-law-flux-surface-lab")).toBe(true);
  });

  it("computes spherical flux from enclosed charge and field from Gaussian area", () => {
    const evidence = gaussLawEvidence(defaultState);

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(approxEqual(evidence.value.model.gaussianAreaSquareMetres, 2.5446900494077327, 1e-12)).toBe(true);
    expect(approxEqual(evidence.value.model.electricFluxVoltsMetres, 361.4109015593661, 1e-12)).toBe(true);
    expect(approxEqual(evidence.value.model.electricFieldVoltsPerMetre, 142.02550980363333, 1e-12)).toBe(true);
  });

  it("keeps spherical flux fixed when only radius changes", () => {
    const near = gaussLawEvidence({ ...defaultState, radiusMetres: 0.3 });
    const far = gaussLawEvidence({ ...defaultState, radiusMetres: 0.9 });

    expect(near.ok).toBe(true);
    expect(far.ok).toBe(true);
    if (!near.ok || !far.ok) throw new Error("Expected valid spherical evidence.");
    expect(approxEqual(near.value.model.electricFluxVoltsMetres, far.value.model.electricFluxVoltsMetres, 1e-6)).toBe(true);
    expect(far.value.model.electricFieldVoltsPerMetre).toBeLessThan(near.value.model.electricFieldVoltsPerMetre);
  });

  it("computes cylindrical and planar enclosed charge from density and area", () => {
    const cylinder = gaussLawEvidence({ ...defaultState, symmetry: "cylindrical" });
    const plane = gaussLawEvidence({ ...defaultState, symmetry: "planar" });

    expect(cylinder.ok).toBe(true);
    expect(plane.ok).toBe(true);
    if (!cylinder.ok || !plane.ok) throw new Error("Expected valid symmetry evidence.");
    expect(approxEqual(cylinder.value.model.enclosedChargeCoulombs, 3e-9, 1e-20)).toBe(true);
    expect(approxEqual(plane.value.model.enclosedChargeCoulombs, 7.2e-10, 1e-20)).toBe(true);
    expect(approxEqual(plane.value.model.gaussianAreaSquareMetres, 0.8, 1e-12)).toBe(true);
  });
});
