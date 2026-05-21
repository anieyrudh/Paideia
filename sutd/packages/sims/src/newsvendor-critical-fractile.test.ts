import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import {
  costSgdPerUnit,
  newsvendorCriticalFractile,
  orderQuantityUnits,
} from "@paideia/optimization";
import { normalizeDistribution } from "@paideia/probability-stats";
import { describe, expect, it } from "vitest";
import { newsvendorCriticalFractilePackageId } from "./newsvendor-critical-fractile.js";

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

const distributionFor = (id: "steady" | "launch" | "volatile") => {
  const scenarios = {
    steady: [
      { id: "d60", value: 60, weight: 12 },
      { id: "d75", value: 75, weight: 20 },
      { id: "d90", value: 90, weight: 32 },
      { id: "d105", value: 105, weight: 24 },
      { id: "d120", value: 120, weight: 12 },
    ],
    launch: [
      { id: "d70", value: 70, weight: 8 },
      { id: "d90", value: 90, weight: 18 },
      { id: "d110", value: 110, weight: 30 },
      { id: "d130", value: 130, weight: 28 },
      { id: "d150", value: 150, weight: 16 },
    ],
    volatile: [
      { id: "d40", value: 40, weight: 16 },
      { id: "d65", value: 65, weight: 26 },
      { id: "d90", value: 90, weight: 24 },
      { id: "d120", value: 120, weight: 20 },
      { id: "d150", value: 150, weight: 14 },
    ],
  } as const;
  const distribution = normalizeDistribution(scenarios[id]);
  if (!distribution.ok) throw new Error(distribution.error.message);
  return distribution.value;
};

const analyze = ({
  scenario,
  orderQuantity = 90,
  underageCost,
  overageCost,
}: {
  readonly scenario: "steady" | "launch" | "volatile";
  readonly orderQuantity?: number;
  readonly underageCost: number;
  readonly overageCost: number;
}) =>
  newsvendorCriticalFractile({
    distribution: distributionFor(scenario),
    orderQuantity: orderQuantityUnits(orderQuantity),
    underageCost: costSgdPerUnit(underageCost),
    overageCost: costSgdPerUnit(overageCost),
    quantityStep: orderQuantityUnits(5),
  });

describe("newsvendor critical fractile analysis", () => {
  it("keeps stocking evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(newsvendorCriticalFractilePackageId, "newsvendor-critical-fractile");

    expect(isRevealed(newsvendorCriticalFractilePackageId, "newsvendor-critical-fractile")).toBe(
      false,
    );
    const committed = commitPrediction(
      newsvendorCriticalFractilePackageId,
      "newsvendor-critical-fractile",
      {
        value: "Above the mean-demand point",
        rationale: "High shortage cost makes the target service level higher.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(newsvendorCriticalFractilePackageId, "newsvendor-critical-fractile")).toBe(
      true,
    );
  });

  it("selects the first demand point whose cumulative probability reaches the fractile", () => {
    const analysis = analyze({
      scenario: "steady",
      orderQuantity: 90,
      underageCost: 18,
      overageCost: 6,
    });

    expect(analysis.ok).toBe(true);
    if (analysis.ok) {
      expect(analysis.value.criticalFractile).toBeCloseTo(0.75);
      expect(analysis.value.meanDemand).toBeCloseTo(90.6);
      expect(analysis.value.recommendedQuantity).toBe(105);
      expect(analysis.value.recommendedServiceLevel).toBeCloseTo(0.88);
      expect(analysis.value.recommendedQuantity).toBeGreaterThan(
        analysis.value.meanDemand,
      );
    }
  });

  it("raises the rule order when shortage cost becomes dominant", () => {
    const leftoverSensitive = analyze({
      scenario: "volatile",
      underageCost: 7,
      overageCost: 22,
    });
    const shortageSensitive = analyze({
      scenario: "volatile",
      underageCost: 24,
      overageCost: 6,
    });

    expect(leftoverSensitive.ok).toBe(true);
    expect(shortageSensitive.ok).toBe(true);
    if (leftoverSensitive.ok && shortageSensitive.ok) {
      expect(shortageSensitive.value.recommendedQuantity).toBeGreaterThan(
        leftoverSensitive.value.recommendedQuantity,
      );
      expect(shortageSensitive.value.dominantPenalty).toBe("shortage");
      expect(leftoverSensitive.value.dominantPenalty).toBe("surplus");
    }
  });

  it("changes expected cost when the learner changes the trial order", () => {
    const lowTrial = analyze({
      scenario: "launch",
      orderQuantity: 90,
      underageCost: 26,
      overageCost: 5,
    });
    const higherTrial = analyze({
      scenario: "launch",
      orderQuantity: 130,
      underageCost: 26,
      overageCost: 5,
    });

    expect(lowTrial.ok).toBe(true);
    expect(higherTrial.ok).toBe(true);
    if (lowTrial.ok && higherTrial.ok) {
      expect(lowTrial.value.selectedExpectedCost).not.toBeCloseTo(
        higherTrial.value.selectedExpectedCost,
      );
      expect(higherTrial.value.selectedServiceLevel).toBeGreaterThan(
        lowTrial.value.selectedServiceLevel,
      );
    }
  });
});
