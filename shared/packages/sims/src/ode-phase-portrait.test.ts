import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  odePhasePortraitEvidence,
  odePhasePortraitPackageId,
} from "./ode-phase-portrait.js";

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

describe("ODE phase portrait evidence", () => {
  it("keeps phase evidence blocked until the prediction gate records a commit", () => {
    installStorage();
    clearPrediction(odePhasePortraitPackageId, "ode-phase-portrait");

    expect(isRevealed(odePhasePortraitPackageId, "ode-phase-portrait")).toBe(false);
    const committed = commitPrediction(odePhasePortraitPackageId, "ode-phase-portrait", {
      value: "Spiral inward toward the equilibrium",
      rationale: "The default trace is negative and the determinant is positive.",
    });

    expect(committed.ok).toBe(true);
    expect(isRevealed(odePhasePortraitPackageId, "ode-phase-portrait")).toBe(true);
  });

  it("classifies the default trace-determinant system as a stable spiral", () => {
    const evidence = odePhasePortraitEvidence({
      preset: "stable-spiral",
      trace: -0.6,
      determinant: 1.2,
      initialX: 1.4,
      initialY: 0,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("stable-spiral");
      expect(evidence.value.stability.trace).toBeCloseTo(-0.6);
      expect(evidence.value.stability.determinant).toBeCloseTo(1.2);
      expect(evidence.value.trajectory.length).toBeGreaterThan(50);
    }
  });

  it("keeps saddle classification in the shared dynamical-systems result", () => {
    const evidence = odePhasePortraitEvidence({
      preset: "saddle",
      trace: 0.2,
      determinant: -0.8,
      initialX: 0.9,
      initialY: 0.8,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("saddle");
    }
  });

  it("classifies every negative determinant in range as a saddle", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1.8, max: 1.8, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1.4, max: -0.1, noNaN: true, noDefaultInfinity: true }),
        (trace, determinant) => {
          const evidence = odePhasePortraitEvidence({
            preset: "saddle",
            trace,
            determinant,
            initialX: 0,
            initialY: 0,
          });

          expect(evidence.ok).toBe(true);
          if (evidence.ok) {
            expect(evidence.value.stability.kind).toBe("saddle");
            expect(approxEqual(evidence.value.stability.determinant, determinant, 1e-6)).toBe(true);
          }
        },
      ),
      { seed: 20260520, numRuns: 25 },
    );
  });

  it("keeps negative-trace positive-determinant spirals stable when discriminant is negative", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1.8, max: -0.2, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.4, max: 2.2, noNaN: true, noDefaultInfinity: true }),
        (trace, determinant) => {
          fc.pre(trace * trace - 4 * determinant < -0.05);

          const evidence = odePhasePortraitEvidence({
            preset: "stable-spiral",
            trace,
            determinant,
            initialX: 0.8,
            initialY: 0,
          });

          expect(evidence.ok).toBe(true);
          if (evidence.ok) {
            expect(evidence.value.stability.kind).toBe("stable-spiral");
            expect(approxEqual(evidence.value.stability.trace, trace, 1e-6)).toBe(true);
          }
        },
      ),
      { seed: 20260521, numRuns: 25 },
    );
  });
});
