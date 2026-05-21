import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  confusionMatrixThresholdEvidence,
  confusionMatrixThresholdsPackageId,
} from "./confusion-matrix-thresholds.js";

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

describe("confusion matrix threshold evidence", () => {
  it("keeps threshold evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(confusionMatrixThresholdsPackageId, "confusion-matrix-thresholds");

    expect(isRevealed(confusionMatrixThresholdsPackageId, "confusion-matrix-thresholds")).toBe(
      false,
    );

    const committed = commitPrediction(
      confusionMatrixThresholdsPackageId,
      "confusion-matrix-thresholds",
      {
        value: "Recall falls, so missed-positive cost can rise",
        rationale: "A stricter threshold creates more missed positive cases.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(confusionMatrixThresholdsPackageId, "confusion-matrix-thresholds")).toBe(
      true,
    );
  });

  it("updates confusion-matrix counts at the default threshold", () => {
    const evidence = confusionMatrixThresholdEvidence({
      thresholdPercent: 65,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.counts).toEqual({
        truePositive: 4,
        falsePositive: 2,
        trueNegative: 6,
        falseNegative: 4,
      });
      expect(approxEqual(evidence.value.precision, 4 / 6)).toBe(true);
      expect(approxEqual(evidence.value.recall, 4 / 8)).toBe(true);
      expect(evidence.value.totalCost).toBe(112);
    }
  });

  it("raising the threshold reduces recall and can increase missed-positive cost", () => {
    const defaultEvidence = confusionMatrixThresholdEvidence({
      thresholdPercent: 65,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });
    const strictEvidence = confusionMatrixThresholdEvidence({
      thresholdPercent: 80,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });

    expect(defaultEvidence.ok).toBe(true);
    expect(strictEvidence.ok).toBe(true);
    if (defaultEvidence.ok && strictEvidence.ok) {
      expect(strictEvidence.value.recall).toBeLessThan(defaultEvidence.value.recall);
      expect(strictEvidence.value.counts.falseNegative).toBeGreaterThan(
        defaultEvidence.value.counts.falseNegative,
      );
      expect(strictEvidence.value.totalCost).toBeGreaterThan(defaultEvidence.value.totalCost);
    }
  });

  it("separates raw error counts from weighted stakeholder cost", () => {
    const evidence = confusionMatrixThresholdEvidence({
      thresholdPercent: 65,
      falseNegativeCost: 5,
      falsePositiveCost: 15,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.counts.falseNegative).toBeGreaterThan(
        evidence.value.counts.falsePositive,
      );
      expect(evidence.value.falsePositiveCostTotal).toBeGreaterThan(
        evidence.value.falseNegativeCostTotal,
      );
    }
  });
});
