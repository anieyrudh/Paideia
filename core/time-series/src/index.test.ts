import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  accuracyMetrics,
  forecastValue,
  holdoutBacktest,
  holtLinearTrend,
  movingAverage,
  observation,
  positiveInteger,
  seasonalNaive,
  simpleExponentialSmoothing,
  smoothingFactor,
  timeIndex,
  validateSeries,
  weightedMovingAverage,
  type ForecastPoint,
  type TimeSeriesPoint,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const point = (t: number, value: number): TimeSeriesPoint => ({
  t: unwrap(timeIndex(t)),
  value: unwrap(observation(value)),
});

const forecast = (t: number, value: number): ForecastPoint => ({
  t: unwrap(timeIndex(t)),
  value: unwrap(forecastValue(value)),
  method: "moving-average",
});

const series = (values: readonly number[]): readonly TimeSeriesPoint[] =>
  values.map((value, index) => point(index + 1, value));

describe("constructors and series validation", () => {
  it("constructs valid branded values and rejects invalid values", () => {
    expect(unwrap(timeIndex(0))).toBe(0);
    expect(unwrap(observation(-2))).toBe(-2);
    expect(unwrap(forecastValue(4))).toBe(4);
    expect(unwrap(smoothingFactor(1))).toBe(1);
    expect(unwrap(positiveInteger(3))).toBe(3);
    expect(timeIndex(Number.NaN).ok).toBe(false);
    expect(observation(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(smoothingFactor(1.2).ok).toBe(false);
    expect(positiveInteger(1.5).ok).toBe(false);
  });

  it("requires a non-empty, strictly increasing, evenly spaced series", () => {
    expect(validateSeries([]).ok).toBe(false);
    expect(validateSeries([point(1, 2), point(1, 3)]).ok).toBe(false);
    expect(validateSeries([point(1, 2), point(2, 3), point(4, 5)]).ok).toBe(false);
    expect(validateSeries([point(1, 2), point(2, 3), point(3, 5)]).ok).toBe(true);
  });

  it("does not mutate caller-owned arrays", () => {
    const input = [point(1, 10), point(2, 20), point(3, 30)];
    const before = input.map((item) => ({ ...item }));
    unwrap(movingAverage(input, { window: unwrap(positiveInteger(2)) }));
    expect(input).toEqual(before);
  });
});

describe("forecast methods", () => {
  it("computes recursive moving-average forecasts", () => {
    const result = unwrap(
      movingAverage(series([10, 20, 30]), {
        window: unwrap(positiveInteger(2)),
        horizon: unwrap(positiveInteger(2)),
      }),
    );
    expect(result.map((item) => item.value)).toEqual([25, 27.5]);
    expect(result.map((item) => item.t)).toEqual([4, 5]);
  });

  it("computes weighted moving averages with newest value paired to last weight", () => {
    const result = unwrap(
      weightedMovingAverage(series([10, 20, 30]), {
        weights: [1, 3],
        horizon: unwrap(positiveInteger(1)),
      }),
    );
    expect(result[0]?.value).toBeCloseTo(27.5);
    expect(weightedMovingAverage(series([10, 20]), { weights: [0, 0] }).ok).toBe(false);
    expect(weightedMovingAverage(series([10]), { weights: [1, 1] }).ok).toBe(false);
  });

  it("computes simple exponential smoothing forecasts", () => {
    const result = unwrap(
      simpleExponentialSmoothing(series([10, 20, 30]), {
        alpha: unwrap(smoothingFactor(0.5)),
        horizon: unwrap(positiveInteger(2)),
      }),
    );
    expect(result.map((item) => item.value)).toEqual([22.5, 22.5]);
  });

  it("computes Holt linear trend forecasts", () => {
    const result = unwrap(
      holtLinearTrend(series([10, 12, 14]), {
        alpha: unwrap(smoothingFactor(1)),
        beta: unwrap(smoothingFactor(1)),
        horizon: unwrap(positiveInteger(2)),
      }),
    );
    expect(result.map((item) => item.value)).toEqual([16, 18]);
    expect(
      holtLinearTrend(series([10]), {
        alpha: unwrap(smoothingFactor(0.5)),
        beta: unwrap(smoothingFactor(0.5)),
      }).ok,
    ).toBe(false);
  });

  it("computes seasonal naive forecasts", () => {
    const result = unwrap(
      seasonalNaive(series([5, 8, 6, 9]), {
        seasonLength: unwrap(positiveInteger(2)),
        horizon: unwrap(positiveInteger(3)),
      }),
    );
    expect(result.map((item) => item.value)).toEqual([6, 9, 6]);
    expect(
      seasonalNaive(series([5]), { seasonLength: unwrap(positiveInteger(2)) }).ok,
    ).toBe(false);
  });
});

describe("accuracy and backtesting", () => {
  it("computes forecast error metrics with MAPE when actuals are non-zero", () => {
    const result = unwrap(
      accuracyMetrics(
        [point(1, 100), point(2, 200)],
        [forecast(1, 90), forecast(2, 220)],
      ),
    );
    expect(result.count).toBe(2);
    expect(result.mae).toBe(15);
    expect(result.mse).toBe(250);
    expect(result.rmse).toBeCloseTo(Math.sqrt(250));
    expect(result.mape).toBeCloseTo(10);
    expect(result.zeroActualCount).toBe(0);
  });

  it("marks MAPE unavailable when actuals include zero", () => {
    const result = unwrap(accuracyMetrics([point(1, 0)], [forecast(1, 3)]));
    expect(result.mape).toBeNull();
    expect(result.zeroActualCount).toBe(1);
  });

  it("rejects mismatched comparison lengths and time indices", () => {
    expect(accuracyMetrics([point(1, 1)], []).ok).toBe(false);
    expect(accuracyMetrics([point(1, 1)], [forecast(2, 1)]).ok).toBe(false);
  });

  it("runs deterministic one-step holdout backtests", () => {
    const result = unwrap(
      holdoutBacktest(series([10, 20, 30, 40]), {
        method: "moving-average",
        window: unwrap(positiveInteger(2)),
      }),
    );
    expect(result.actuals.map((item) => item.t)).toEqual([3, 4]);
    expect(result.forecasts.map((item) => item.value)).toEqual([15, 25]);
    expect(result.accuracy.mae).toBe(15);
  });

  it("rejects too-short backtests", () => {
    expect(
      holdoutBacktest(series([10]), {
        method: "moving-average",
        window: unwrap(positiveInteger(1)),
      }).ok,
    ).toBe(false);
  });
});

describe("properties", () => {
  it("constant series stays constant under supported deterministic forecasts", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000, max: 1_000, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 3, max: 10 }),
        (value, length) => {
          const data = series(Array.from({ length }, () => value));
          expect(
            unwrap(movingAverage(data, { window: unwrap(positiveInteger(2)) }))[0]?.value,
          ).toBeCloseTo(value);
          expect(
            unwrap(simpleExponentialSmoothing(data, {
              alpha: unwrap(smoothingFactor(0.35)),
            }))[0]?.value,
          ).toBeCloseTo(value);
          expect(
            unwrap(seasonalNaive(data, { seasonLength: unwrap(positiveInteger(2)) }))[0]
              ?.value,
          ).toBeCloseTo(value);
        },
      ),
    );
  });

  it("MAE is zero when forecasts equal actuals", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -1_000, max: 1_000, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 12,
        }),
        (values) => {
          const actuals = series(values);
          const forecasts = values.map((value, index) => forecast(index + 1, value));
          expect(unwrap(accuracyMetrics(actuals, forecasts)).mae).toBe(0);
        },
      ),
    );
  });
});
