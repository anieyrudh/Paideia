import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  eigenvectorEvidence,
  eigenvectorTransformationsPackageId,
} from "./eigenvector-transformations.js";

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

describe("eigenvector transformations evidence", () => {
  it("keeps eigenvector evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(eigenvectorTransformationsPackageId, "eigenvector-transformations");

    expect(isRevealed(eigenvectorTransformationsPackageId, "eigenvector-transformations")).toBe(
      false,
    );
    const committed = commitPrediction(
      eigenvectorTransformationsPackageId,
      "eigenvector-transformations",
      {
        value: "Av = (3, 0), so the vector stays on its line and triples",
        rationale: "The vector remains on the x-axis.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(eigenvectorTransformationsPackageId, "eigenvector-transformations")).toBe(
      true,
    );
  });

  it("identifies the default x-axis vector as an eigenvector", () => {
    const evidence = eigenvectorEvidence({
      a11: 3,
      a12: 1,
      a21: 0,
      a22: 2,
      x: 1,
      y: 0,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.transformed).toEqual([3, 0]);
      expect(evidence.value.check.lambda).toBeCloseTo(3);
      expect(evidence.value.check.isEigenvector).toBe(true);
    }
  });

  it("rejects a tilted candidate when components need different scale factors", () => {
    const evidence = eigenvectorEvidence({
      a11: 3,
      a12: 1,
      a21: 0,
      a22: 2,
      x: 1,
      y: 1,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.transformed).toEqual([4, 2]);
      expect(evidence.value.check.isEigenvector).toBe(false);
    }
  });
});
