import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  inductionEvidence,
  magneticInductionFaradayLenzPackageId,
} from "./magnetic-induction-faraday-lenz.js";

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

describe("magnetic induction Faraday-Lenz sim", () => {
  it("keeps induction evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(magneticInductionFaradayLenzPackageId, "magnetic-induction-faraday-lenz");

    expect(isRevealed(magneticInductionFaradayLenzPackageId, "magnetic-induction-faraday-lenz")).toBe(false);
    const committed = commitPrediction(
      magneticInductionFaradayLenzPackageId,
      "magnetic-induction-faraday-lenz",
      {
        rationale: "The induced field opposes the increasing outward flux.",
        value: "Into the page, because Lenz's law opposes the increase in outward flux.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(magneticInductionFaradayLenzPackageId, "magnetic-induction-faraday-lenz")).toBe(true);
  });

  it("computes emf and current from flux-rate evidence", () => {
    const evidence = inductionEvidence({
      angleToNormalDegrees: 0,
      durationMilliseconds: 300,
      finalFieldMilliTeslas: 500,
      initialFieldMilliTeslas: 100,
      loopAreaSquareCentimetres: 120,
      resistanceOhms: 8,
      turns: 40,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) throw new Error(evidence.error.message);
    expect(approxEqual(evidence.value.model.fluxChangeWebers, 0.0048, 1e-12)).toBe(true);
    expect(approxEqual(evidence.value.model.inducedEmfVolts, -0.64, 1e-12)).toBe(true);
    expect(approxEqual(evidence.value.model.inducedCurrentAmps, 0.08, 1e-12)).toBe(true);
    expect(evidence.value.model.lenzOpposition).toBe("oppose-increase");
  });

  it("reduces emf when the loop is tilted away from the field normal", () => {
    const faceOn = inductionEvidence({
      angleToNormalDegrees: 0,
      durationMilliseconds: 500,
      finalFieldMilliTeslas: 400,
      initialFieldMilliTeslas: 100,
      loopAreaSquareCentimetres: 100,
      resistanceOhms: 10,
      turns: 20,
    });
    const tilted = inductionEvidence({
      angleToNormalDegrees: 60,
      durationMilliseconds: 500,
      finalFieldMilliTeslas: 400,
      initialFieldMilliTeslas: 100,
      loopAreaSquareCentimetres: 100,
      resistanceOhms: 10,
      turns: 20,
    });

    expect(faceOn.ok).toBe(true);
    expect(tilted.ok).toBe(true);
    if (!faceOn.ok || !tilted.ok) throw new Error("Expected valid induction evidence.");
    expect(approxEqual(tilted.value.model.inducedEmfMagnitudeVolts / faceOn.value.model.inducedEmfMagnitudeVolts, 0.5, 1e-12)).toBe(true);
  });
});
