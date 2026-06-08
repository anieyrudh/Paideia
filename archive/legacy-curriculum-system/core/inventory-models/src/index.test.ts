import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { approxEqual, probability, type KernelResult, type Probability } from "@paideia/shared";

import {
  costPerOrder,
  demandStdDevUnitsPerPeriod,
  demandUnitsPerPeriod,
  economicOrderQuantity,
  holdingCostPerUnitPerPeriod,
  inventoryUnits,
  leadTimePeriods,
  reorderPoint,
  safetyStockFromServiceLevel,
  safetyStockFromZ,
  totalAnnualCost,
  unitCost,
  zScore,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const p = (value: number): Probability => unwrap(probability(value));

describe("@paideia/inventory-models constructors", () => {
  it("constructs valid brands and rejects invalid values", () => {
    expect(unwrap(inventoryUnits(0))).toBe(0);
    expect(unwrap(demandUnitsPerPeriod(12))).toBe(12);
    expect(unwrap(demandStdDevUnitsPerPeriod(0))).toBe(0);
    expect(unwrap(leadTimePeriods(0.25))).toBe(0.25);
    expect(unwrap(costPerOrder(50))).toBe(50);
    expect(unwrap(holdingCostPerUnitPerPeriod(2))).toBe(2);
    expect(unwrap(unitCost(0))).toBe(0);
    expect(unwrap(zScore(1.645))).toBe(1.645);

    expect(inventoryUnits(-1).ok).toBe(false);
    expect(demandUnitsPerPeriod(0).ok).toBe(false);
    expect(demandStdDevUnitsPerPeriod(Number.NaN).ok).toBe(false);
    expect(leadTimePeriods(0).ok).toBe(false);
    expect(costPerOrder(0).ok).toBe(false);
    expect(holdingCostPerUnitPerPeriod(-2).ok).toBe(false);
    expect(unitCost(-1).ok).toBe(false);
    expect(zScore(-0.1).ok).toBe(false);
  });
});

describe("EOQ and annual cost", () => {
  it("computes the textbook EOQ and balanced relevant costs", () => {
    const result = unwrap(
      economicOrderQuantity({
        demandRate: unwrap(demandUnitsPerPeriod(1200)),
        orderCost: unwrap(costPerOrder(50)),
        holdingCost: unwrap(holdingCostPerUnitPerPeriod(2)),
      }),
    );

    expect(result.economicOrderQuantity).toBeCloseTo(Math.sqrt(60_000), 10);
    expect(result.cycleCount).toBeCloseTo(1200 / Math.sqrt(60_000), 10);
    expect(result.annualOrderingCost).toBeCloseTo(result.annualHoldingCost, 10);
    expect(result.totalRelevantCost).toBeCloseTo(
      result.annualOrderingCost + result.annualHoldingCost,
      10,
    );
  });

  it("computes total annual cost with optional purchase cost", () => {
    const result = unwrap(
      totalAnnualCost({
        demandRate: unwrap(demandUnitsPerPeriod(1000)),
        orderQuantity: unwrap(inventoryUnits(200)),
        orderCost: unwrap(costPerOrder(25)),
        holdingCost: unwrap(holdingCostPerUnitPerPeriod(4)),
        unitCost: unwrap(unitCost(8)),
      }),
    );

    expect(result.orderingCost).toBe(125);
    expect(result.holdingCost).toBe(400);
    expect(result.purchaseCost).toBe(8000);
    expect(result.totalRelevantCost).toBe(525);
    expect(result.totalAnnualCost).toBe(8525);
  });

  it("rejects zero order quantity in annual cost", () => {
    const result = totalAnnualCost({
      demandRate: unwrap(demandUnitsPerPeriod(1000)),
      orderQuantity: unwrap(inventoryUnits(0)),
      orderCost: unwrap(costPerOrder(25)),
      holdingCost: unwrap(holdingCostPerUnitPerPeriod(4)),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("property: EOQ minimizes the convex relevant-cost curve near sampled perturbations", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.2, max: 4, noNaN: true, noDefaultInfinity: true }),
        (demand, setup, holding, multiplier) => {
          const eoq = unwrap(
            economicOrderQuantity({
              demandRate: unwrap(demandUnitsPerPeriod(demand)),
              orderCost: unwrap(costPerOrder(setup)),
              holdingCost: unwrap(holdingCostPerUnitPerPeriod(holding)),
            }),
          );
          const sampledQuantity = unwrap(inventoryUnits(eoq.economicOrderQuantity * multiplier));
          const sampledCost = unwrap(
            totalAnnualCost({
              demandRate: unwrap(demandUnitsPerPeriod(demand)),
              orderQuantity: sampledQuantity,
              orderCost: unwrap(costPerOrder(setup)),
              holdingCost: unwrap(holdingCostPerUnitPerPeriod(holding)),
            }),
          );

          expect(sampledCost.totalRelevantCost).toBeGreaterThanOrEqual(
            eoq.totalRelevantCost - 1e-7,
          );
        },
      ),
      { seed: 42, numRuns: 75 },
    );
  });
});

describe("safety stock and reorder point", () => {
  it("computes safety stock from a supplied z-score", () => {
    const result = unwrap(
      safetyStockFromZ({
        zScore: unwrap(zScore(1.65)),
        demandStandardDeviation: unwrap(demandStdDevUnitsPerPeriod(20)),
        leadTime: unwrap(leadTimePeriods(4)),
      }),
    );

    expect(result.demandStandardDeviationDuringLeadTime).toBe(40);
    expect(result.safetyStock).toBeCloseTo(66, 10);
    expect(result.serviceLevel).toBeNull();
  });

  it("computes safety stock from a cycle service level", () => {
    const result = unwrap(
      safetyStockFromServiceLevel({
        serviceLevel: p(0.95),
        demandStandardDeviation: unwrap(demandStdDevUnitsPerPeriod(20)),
        leadTime: unwrap(leadTimePeriods(4)),
      }),
    );

    expect(result.zScore).toBeCloseTo(1.644853625, 6);
    expect(result.safetyStock).toBeCloseTo(65.794145, 5);
    expect(result.serviceLevel).toBe(0.95);
  });

  it("rejects service levels that imply negative or infinite safety stock", () => {
    const low = safetyStockFromServiceLevel({
      serviceLevel: p(0.49),
      demandStandardDeviation: unwrap(demandStdDevUnitsPerPeriod(20)),
      leadTime: unwrap(leadTimePeriods(4)),
    });
    expect(low.ok).toBe(false);
    if (!low.ok) expect(low.error.code).toBe("out-of-domain");

    const one = safetyStockFromServiceLevel({
      serviceLevel: p(1),
      demandStandardDeviation: unwrap(demandStdDevUnitsPerPeriod(20)),
      leadTime: unwrap(leadTimePeriods(4)),
    });
    expect(one.ok).toBe(false);
    if (!one.ok) expect(one.error.code).toBe("out-of-domain");
  });

  it("computes reorder point with and without safety stock", () => {
    const withoutSafety = unwrap(
      reorderPoint({
        averageDemand: unwrap(demandUnitsPerPeriod(30)),
        leadTime: unwrap(leadTimePeriods(2)),
      }),
    );
    expect(withoutSafety.expectedLeadTimeDemand).toBe(60);
    expect(withoutSafety.safetyStock).toBe(0);
    expect(withoutSafety.reorderPoint).toBe(60);

    const withSafety = unwrap(
      reorderPoint({
        averageDemand: unwrap(demandUnitsPerPeriod(30)),
        leadTime: unwrap(leadTimePeriods(2)),
        safetyStock: unwrap(inventoryUnits(12)),
      }),
    );
    expect(withSafety.reorderPoint).toBe(72);
  });

  it("property: reorder point is monotone in safety stock", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 12, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (demand, leadTime, firstSafety, secondSafety) => {
          const lowSafety = Math.min(firstSafety, secondSafety);
          const highSafety = Math.max(firstSafety, secondSafety);
          const low = unwrap(
            reorderPoint({
              averageDemand: unwrap(demandUnitsPerPeriod(demand)),
              leadTime: unwrap(leadTimePeriods(leadTime)),
              safetyStock: unwrap(inventoryUnits(lowSafety)),
            }),
          );
          const high = unwrap(
            reorderPoint({
              averageDemand: unwrap(demandUnitsPerPeriod(demand)),
              leadTime: unwrap(leadTimePeriods(leadTime)),
              safetyStock: unwrap(inventoryUnits(highSafety)),
            }),
          );

          expect(high.reorderPoint).toBeGreaterThanOrEqual(low.reorderPoint);
          expect(approxEqual(high.reorderPoint - low.reorderPoint, highSafety - lowSafety, 1e-8))
            .toBe(true);
        },
      ),
      { seed: 84, numRuns: 75 },
    );
  });
});
