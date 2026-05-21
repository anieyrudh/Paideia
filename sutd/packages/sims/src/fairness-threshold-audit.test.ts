import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  fairnessThresholdAuditEvidence,
  fairnessThresholdAuditPackageId,
} from "./fairness-threshold-audit.js";

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

describe("fairness threshold audit evidence", () => {
  it("keeps group audit evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(fairnessThresholdAuditPackageId, "fairness-threshold-audit");

    expect(isRevealed(fairnessThresholdAuditPackageId, "fairness-threshold-audit")).toBe(false);

    const committed = commitPrediction(
      fairnessThresholdAuditPackageId,
      "fairness-threshold-audit",
      {
        value: "The group with lower recall can carry more missed-support harm",
        rationale: "The same threshold can produce different false-negative counts by group.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(fairnessThresholdAuditPackageId, "fairness-threshold-audit")).toBe(true);
  });

  it("shows a recall and harm gap for the default single-threshold policy", () => {
    const evidence = fairnessThresholdAuditEvidence({
      globalThresholdPercent: 70,
      groupBAdjustmentPercent: 0,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.groupA.evidence.counts).toEqual({
        truePositive: 3,
        falsePositive: 2,
        trueNegative: 3,
        falseNegative: 2,
      });
      expect(evidence.value.groupB.evidence.counts).toEqual({
        truePositive: 1,
        falsePositive: 2,
        trueNegative: 3,
        falseNegative: 4,
      });
      expect(approxEqual(evidence.value.groupA.evidence.recall, 3 / 5)).toBe(true);
      expect(approxEqual(evidence.value.groupB.evidence.recall, 1 / 5)).toBe(true);
      expect(approxEqual(evidence.value.recallGap, 0.4)).toBe(true);
      expect(evidence.value.costGap).toBe(50);
      expect(evidence.value.auditFlag).toBe("review-required");
    }
  });

  it("lowering Group B's threshold can reduce the recall gap without changing the data", () => {
    const singleThreshold = fairnessThresholdAuditEvidence({
      globalThresholdPercent: 70,
      groupBAdjustmentPercent: 0,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });
    const adjustedThreshold = fairnessThresholdAuditEvidence({
      globalThresholdPercent: 70,
      groupBAdjustmentPercent: -10,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    });

    expect(singleThreshold.ok).toBe(true);
    expect(adjustedThreshold.ok).toBe(true);
    if (singleThreshold.ok && adjustedThreshold.ok) {
      expect(adjustedThreshold.value.recallGap).toBeLessThan(singleThreshold.value.recallGap);
      expect(adjustedThreshold.value.costGap).toBeLessThan(singleThreshold.value.costGap);
      expect(adjustedThreshold.value.groupB.thresholdPercent).toBe(60);
      expect(adjustedThreshold.value.groupB.evidence.counts.falseNegative).toBe(2);
    }
  });
});
