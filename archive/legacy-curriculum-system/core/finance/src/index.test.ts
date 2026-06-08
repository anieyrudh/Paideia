import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  analyzeFinancialSnapshot,
  currentRatio,
  debtToEquity,
  discountFactor,
  discountRate,
  financialRatio,
  internalRateOfReturn,
  inventoryTurnover,
  money,
  netPresentValue,
  netProfitMargin,
  nonNegativeMoney,
  paybackPeriod,
  period,
  presentValue,
  quickRatio,
  returnOnAssets,
  validateCashFlows,
  type CashFlow,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const flow = (when: number, amount: number): CashFlow => ({
  period: unwrap(period(when)),
  amount: unwrap(money(amount)),
});

describe("constructors and cash-flow validation", () => {
  it("constructs valid brands and rejects invalid values", () => {
    expect(unwrap(money(-100))).toBe(-100);
    expect(unwrap(nonNegativeMoney(0))).toBe(0);
    expect(unwrap(discountRate(0.1))).toBe(0.1);
    expect(unwrap(financialRatio(-0.2))).toBe(-0.2);
    expect(unwrap(period(3))).toBe(3);
    expect(money(Number.NaN).ok).toBe(false);
    expect(nonNegativeMoney(-1).ok).toBe(false);
    expect(discountRate(-1).ok).toBe(false);
    expect(period(1.5).ok).toBe(false);
  });

  it("requires non-empty, strictly increasing cash-flow periods", () => {
    expect(validateCashFlows([]).ok).toBe(false);
    expect(validateCashFlows([flow(0, -100), flow(0, 20)]).ok).toBe(false);
    expect(validateCashFlows([flow(1, 20), flow(0, -100)]).ok).toBe(false);
    expect(validateCashFlows([flow(0, -100), flow(1, 20)]).ok).toBe(true);
  });

  it("does not mutate caller-owned cash-flow arrays", () => {
    const input = [flow(0, -100), flow(1, 60), flow(2, 60)];
    const before = input.map((item) => ({ ...item }));
    unwrap(netPresentValue({ cashFlows: input, discountRate: unwrap(discountRate(0.1)) }));
    expect(input).toEqual(before);
  });
});

describe("time value of money", () => {
  it("computes discount factors and present value", () => {
    const rate = unwrap(discountRate(0.1));
    expect(unwrap(discountFactor({ discountRate: rate, period: unwrap(period(2)) }))).toBeCloseTo(
      1 / 1.21,
    );
    expect(unwrap(presentValue({ cashFlow: flow(2, 121), discountRate: rate }))).toBeCloseTo(100);
  });

  it("computes NPV for a simple project", () => {
    const result = unwrap(
      netPresentValue({
        cashFlows: [flow(0, -1000), flow(1, 400), flow(2, 400), flow(3, 400)],
        discountRate: unwrap(discountRate(0.1)),
      }),
    );
    expect(result).toBeCloseTo(-5.2592, 3);
  });

  it("computes IRR by bracketed bisection and rejects invalid roots", () => {
    const result = unwrap(
      internalRateOfReturn({
        cashFlows: [flow(0, -100), flow(1, 60), flow(2, 60)],
        lowerRate: unwrap(discountRate(0)),
        upperRate: unwrap(discountRate(1)),
      }),
    );
    expect(result.rate).toBeCloseTo(0.13066, 4);
    expect(Math.abs(result.npv)).toBeLessThan(1e-5);
    expect(internalRateOfReturn({ cashFlows: [flow(0, -100), flow(1, -20)] }).ok).toBe(false);
    expect(
      internalRateOfReturn({
        cashFlows: [flow(0, -100), flow(1, 10)],
        lowerRate: unwrap(discountRate(0)),
        upperRate: unwrap(discountRate(1)),
      }).ok,
    ).toBe(false);
    expect(
      internalRateOfReturn({
        cashFlows: [flow(0, -100), flow(1, 240), flow(2, -150)],
      }).ok,
    ).toBe(false);
  });

  it("computes undiscounted payback period with interpolation", () => {
    const result = unwrap(paybackPeriod([flow(0, -100), flow(1, 40), flow(2, 80)]));
    expect(result.paidBack).toBe(true);
    expect(result.period).toBeCloseTo(1.75);
    expect(result.cumulativeCashFlow).toBe(20);
    expect(unwrap(paybackPeriod([flow(0, -100), flow(1, 40)])).paidBack).toBe(false);
  });
});

describe("financial ratios", () => {
  it("computes common ratios and rejects zero denominators", () => {
    expect(
      unwrap(
        currentRatio({
          currentAssets: unwrap(nonNegativeMoney(300)),
          currentLiabilities: unwrap(nonNegativeMoney(150)),
        }),
      ),
    ).toBe(2);
    expect(
      unwrap(
        quickRatio({
          currentAssets: unwrap(nonNegativeMoney(300)),
          inventory: unwrap(nonNegativeMoney(80)),
          currentLiabilities: unwrap(nonNegativeMoney(110)),
        }),
      ),
    ).toBe(2);
    expect(
      currentRatio({
        currentAssets: unwrap(nonNegativeMoney(300)),
        currentLiabilities: unwrap(nonNegativeMoney(0)),
      }).ok,
    ).toBe(false);
  });

  it("computes leverage, margin, ROA, and turnover", () => {
    expect(
      unwrap(
        debtToEquity({
          totalLiabilities: unwrap(nonNegativeMoney(400)),
          totalEquity: unwrap(money(200)),
        }),
      ),
    ).toBe(2);
    expect(
      unwrap(
        netProfitMargin({
          numerator: unwrap(money(50)),
          revenue: unwrap(nonNegativeMoney(500)),
        }),
      ),
    ).toBe(0.1);
    expect(
      unwrap(
        returnOnAssets({
          netIncome: unwrap(money(60)),
          totalAssets: unwrap(nonNegativeMoney(600)),
        }),
      ),
    ).toBe(0.1);
    expect(
      unwrap(
        inventoryTurnover({
          numerator: unwrap(nonNegativeMoney(240)),
          denominator: unwrap(nonNegativeMoney(40)),
        }),
      ),
    ).toBe(6);
  });

  it("analyzes a complete financial snapshot", () => {
    const result = unwrap(
      analyzeFinancialSnapshot({
        currentAssets: unwrap(nonNegativeMoney(300)),
        inventory: unwrap(nonNegativeMoney(100)),
        currentLiabilities: unwrap(nonNegativeMoney(150)),
        totalAssets: unwrap(nonNegativeMoney(1000)),
        totalLiabilities: unwrap(nonNegativeMoney(450)),
        totalEquity: unwrap(money(550)),
        revenue: unwrap(nonNegativeMoney(800)),
        netIncome: unwrap(money(80)),
        costOfGoodsSold: unwrap(nonNegativeMoney(400)),
        averageInventory: unwrap(nonNegativeMoney(100)),
      }),
    );
    expect(result.currentRatio).toBe(2);
    expect(result.quickRatio).toBeCloseTo(4 / 3);
    expect(result.debtToEquity).toBeCloseTo(450 / 550);
    expect(result.netProfitMargin).toBe(0.1);
    expect(result.returnOnAssets).toBe(0.08);
    expect(result.inventoryTurnover).toBe(4);
  });
});

describe("properties", () => {
  it("NPV decreases as the discount rate increases for non-negative future cash flows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1_000 }), { minLength: 1, maxLength: 8 }),
        fc.double({ min: 0, max: 0.4, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.41, max: 1, noNaN: true, noDefaultInfinity: true }),
        (amounts, lowRate, highRate) => {
          const cashFlows = [flow(0, -100), ...amounts.map((amount, index) => flow(index + 1, amount))];
          const low = unwrap(
            netPresentValue({
              cashFlows,
              discountRate: unwrap(discountRate(lowRate)),
            }),
          );
          const high = unwrap(
            netPresentValue({
              cashFlows,
              discountRate: unwrap(discountRate(highRate)),
            }),
          );
          expect(high).toBeLessThanOrEqual(low + 1e-9);
        },
      ),
    );
  });

  it("present value equals cash flow at a zero discount rate", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: 0, max: 20 }),
        (amount, when) => {
          expect(
            unwrap(
              presentValue({
                cashFlow: flow(when, amount),
                discountRate: unwrap(discountRate(0)),
              }),
            ),
          ).toBe(amount);
        },
      ),
    );
  });
});
