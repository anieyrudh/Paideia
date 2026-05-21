import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  linearSystemStabilityEvidence,
  linearSystemStabilityPackageId,
} from "./linear-system-stability.js";

type StabilityInput = Parameters<typeof linearSystemStabilityEvidence>[0];

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

describe("linear system stability evidence", () => {
  it("keeps stability evidence blocked until the prediction gate records a commit", () => {
    installStorage();
    clearPrediction(linearSystemStabilityPackageId, "linear-system-stability");

    expect(isRevealed(linearSystemStabilityPackageId, "linear-system-stability")).toBe(false);
    const committed = commitPrediction(linearSystemStabilityPackageId, "linear-system-stability", {
      value: "It spirals inward and settles near the origin",
      rationale: "The trace is negative, determinant positive, and the real part is negative.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(linearSystemStabilityPackageId, "linear-system-stability")).toBe(true);
  });

  it("classifies the default damped oscillator as a stable spiral", () => {
    const evidence = linearSystemStabilityEvidence({
      preset: "damped-oscillator",
      aPerTimeUnit: 0,
      bPerTimeUnit: 1,
      cPerTimeUnit: -1.2,
      dPerTimeUnit: -0.6,
      initialXStateUnits: 1.35,
      initialYStateUnits: 0.1,
    } as StabilityInput);

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("stable-spiral");
      expect(evidence.value.stability.trace).toBeCloseTo(-0.6);
      expect(evidence.value.stability.determinant).toBeCloseTo(1.2);
      expect(evidence.value.trajectory.length).toBeGreaterThan(80);
      expect(evidence.value.eigenpairs).toBeNull();
    }
  });

  it("uses real eigendirection evidence for a saddle split", () => {
    const evidence = linearSystemStabilityEvidence({
      preset: "saddle-split",
      aPerTimeUnit: 0.25,
      bPerTimeUnit: 1,
      cPerTimeUnit: 1.1,
      dPerTimeUnit: -0.35,
      initialXStateUnits: 0.05,
      initialYStateUnits: 0.04,
    } as StabilityInput);

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("saddle");
      expect(evidence.value.eigenpairs).not.toBeNull();
      expect(evidence.value.eigendirectionCheck?.ok).toBe(true);
      if (evidence.value.eigendirectionCheck?.ok) {
        expect(evidence.value.eigendirectionCheck.value.isEigenvector).toBe(true);
      }
    }
  });
});
