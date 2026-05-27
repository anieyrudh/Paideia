import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type TimeIndex = Brand<number, "TimeSeries.TimeIndex">;
export type Observation = Brand<number, "TimeSeries.Observation">;
export type ForecastValue = Brand<number, "TimeSeries.ForecastValue">;
export type SmoothingFactor = Brand<number, "TimeSeries.SmoothingFactor">;
export type PositiveInteger = Brand<number, "TimeSeries.PositiveInteger">;

export type ForecastMethod =
  | "moving-average"
  | "weighted-moving-average"
  | "simple-exponential-smoothing"
  | "holt-linear-trend"
  | "seasonal-naive";

export interface TimeSeriesPoint {
  readonly t: TimeIndex;
  readonly value: Observation;
}

export interface ForecastPoint {
  readonly t: TimeIndex;
  readonly value: ForecastValue;
  readonly method: ForecastMethod;
}

export interface ForecastAccuracy {
  readonly count: number;
  readonly mae: number;
  readonly mse: number;
  readonly rmse: number;
  readonly mape: number | null;
  readonly zeroActualCount: number;
}

export type BacktestMethodConfig =
  | { readonly method: "moving-average"; readonly window: PositiveInteger }
  | { readonly method: "weighted-moving-average"; readonly weights: readonly number[] }
  | {
      readonly method: "simple-exponential-smoothing";
      readonly alpha: SmoothingFactor;
    }
  | {
      readonly method: "holt-linear-trend";
      readonly alpha: SmoothingFactor;
      readonly beta: SmoothingFactor;
    }
  | { readonly method: "seasonal-naive"; readonly seasonLength: PositiveInteger };

export interface BacktestResult {
  readonly forecasts: readonly ForecastPoint[];
  readonly actuals: readonly TimeSeriesPoint[];
  readonly accuracy: ForecastAccuracy;
}

interface HorizonInput {
  readonly horizon?: PositiveInteger;
}

export const timeIndex = (value: number): KernelResult<TimeIndex> =>
  finite(value)
    ? ok(value as TimeIndex)
    : err("out-of-domain", `timeIndex must be finite, got ${value}`);

export const observation = (value: number): KernelResult<Observation> =>
  finite(value)
    ? ok(value as Observation)
    : err("out-of-domain", `observation must be finite, got ${value}`);

export const forecastValue = (value: number): KernelResult<ForecastValue> =>
  finite(value)
    ? ok(value as ForecastValue)
    : err("out-of-domain", `forecastValue must be finite, got ${value}`);

export const smoothingFactor = (value: number): KernelResult<SmoothingFactor> => {
  if (!finite(value) || value < 0 || value > 1) {
    return err(
      "out-of-domain",
      `smoothingFactor must be finite and between 0 and 1, got ${value}`,
    );
  }
  return ok(value as SmoothingFactor);
};

export const positiveInteger = (value: number): KernelResult<PositiveInteger> => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return err(
      "precondition-violated",
      `positiveInteger must be a positive safe integer, got ${value}`,
    );
  }
  return ok(value as PositiveInteger);
};

export const validateSeries = (
  points: readonly TimeSeriesPoint[],
): KernelResult<readonly TimeSeriesPoint[]> => {
  if (points.length === 0) {
    return err("precondition-violated", "time series must contain at least one point");
  }
  for (const point of points) {
    const t = timeIndex(point.t);
    if (!t.ok) {
      return t;
    }
    const y = observation(point.value);
    if (!y.ok) {
      return y;
    }
  }
  if (points.length >= 2) {
    const first = points[0];
    const second = points[1];
    if (first === undefined || second === undefined) {
      return err("precondition-violated", "series index was missing");
    }
    const firstStep = second.t - first.t;
    if (!finite(firstStep) || firstStep <= 0) {
      return err("precondition-violated", "time indices must be strictly increasing");
    }
    for (let index = 2; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (previous === undefined || current === undefined) {
        return err("precondition-violated", "series index was missing");
      }
      const step = current.t - previous.t;
      if (!finite(step) || step <= 0) {
        return err("precondition-violated", "time indices must be strictly increasing");
      }
      if (!sameSpacing(step, firstStep)) {
        return err("precondition-violated", "time indices must be evenly spaced");
      }
    }
  }
  return ok([...points]);
};

export const movingAverage = (
  points: readonly TimeSeriesPoint[],
  input: { readonly window: PositiveInteger; readonly horizon?: PositiveInteger },
): KernelResult<readonly ForecastPoint[]> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  const window = positiveInteger(input.window);
  if (!window.ok) {
    return window;
  }
  if (window.value > checked.value.length) {
    return err("precondition-violated", "moving-average window exceeds series length");
  }
  const horizon = forecastHorizon(input);
  if (!horizon.ok) {
    return horizon;
  }
  const values = checked.value.map((point) => point.value);
  return recursiveForecast(checked.value, horizon.value, "moving-average", values, () =>
    mean(tail(values, window.value)),
  );
};

export const weightedMovingAverage = (
  points: readonly TimeSeriesPoint[],
  input: { readonly weights: readonly number[]; readonly horizon?: PositiveInteger },
): KernelResult<readonly ForecastPoint[]> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  const weights = validateWeights(input.weights);
  if (!weights.ok) {
    return weights;
  }
  if (weights.value.length > checked.value.length) {
    return err("precondition-violated", "weighted-moving-average window exceeds series length");
  }
  const horizon = forecastHorizon(input);
  if (!horizon.ok) {
    return horizon;
  }
  const weightSum = sumWeights(weights.value);
  const values = checked.value.map((point) => point.value);
  return recursiveForecast(checked.value, horizon.value, "weighted-moving-average", values, () => {
    const recent = tail(values, weights.value.length);
    const numerator = recent.reduce(
      (sum, value, index) => sum + value * (weights.value[index] ?? 0),
      0,
    );
    return numerator / weightSum;
  });
};

export const simpleExponentialSmoothing = (
  points: readonly TimeSeriesPoint[],
  input: { readonly alpha: SmoothingFactor; readonly horizon?: PositiveInteger },
): KernelResult<readonly ForecastPoint[]> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  const alpha = smoothingFactor(input.alpha);
  if (!alpha.ok) {
    return alpha;
  }
  const horizon = forecastHorizon(input);
  if (!horizon.ok) {
    return horizon;
  }
  const initialLevel = checked.value[0]?.value;
  if (initialLevel === undefined) {
    return err("precondition-violated", "time series must contain at least one point");
  }
  let level: number = initialLevel;
  for (let index = 1; index < checked.value.length; index += 1) {
    const point = checked.value[index];
    if (point === undefined) {
      return err("precondition-violated", "series index was missing");
    }
    level = alpha.value * point.value + (1 - alpha.value) * level;
  }
  return constantForecast(checked.value, horizon.value, "simple-exponential-smoothing", level);
};

export const holtLinearTrend = (
  points: readonly TimeSeriesPoint[],
  input: {
    readonly alpha: SmoothingFactor;
    readonly beta: SmoothingFactor;
    readonly horizon?: PositiveInteger;
  },
): KernelResult<readonly ForecastPoint[]> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  if (checked.value.length < 2) {
    return err("precondition-violated", "holt-linear-trend requires at least two points");
  }
  const alpha = smoothingFactor(input.alpha);
  if (!alpha.ok) {
    return alpha;
  }
  const beta = smoothingFactor(input.beta);
  if (!beta.ok) {
    return beta;
  }
  const horizon = forecastHorizon(input);
  if (!horizon.ok) {
    return horizon;
  }
  const first = checked.value[0];
  const second = checked.value[1];
  if (first === undefined || second === undefined) {
    return err("precondition-violated", "holt-linear-trend requires at least two points");
  }
  let level: number = first.value;
  let trend = second.value - first.value;
  for (let index = 1; index < checked.value.length; index += 1) {
    const point = checked.value[index];
    if (point === undefined) {
      return err("precondition-violated", "series index was missing");
    }
    const previousLevel = level;
    level = alpha.value * point.value + (1 - alpha.value) * (level + trend);
    trend = beta.value * (level - previousLevel) + (1 - beta.value) * trend;
    if (!finite(level) || !finite(trend)) {
      return err("numerical-instability", "holt-linear-trend produced a non-finite state");
    }
  }
  return futureForecast(
    checked.value,
    horizon.value,
    "holt-linear-trend",
    (step) => level + step * trend,
  );
};

export const seasonalNaive = (
  points: readonly TimeSeriesPoint[],
  input: { readonly seasonLength: PositiveInteger; readonly horizon?: PositiveInteger },
): KernelResult<readonly ForecastPoint[]> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  const seasonLength = positiveInteger(input.seasonLength);
  if (!seasonLength.ok) {
    return seasonLength;
  }
  if (seasonLength.value > checked.value.length) {
    return err("precondition-violated", "seasonLength exceeds series length");
  }
  const horizon = forecastHorizon(input);
  if (!horizon.ok) {
    return horizon;
  }
  const season = checked.value.slice(-seasonLength.value).map((point) => point.value);
  return futureForecast(checked.value, horizon.value, "seasonal-naive", (step) => {
    const index = (step - 1) % season.length;
    const value = season[index];
    return value ?? Number.NaN;
  });
};

export const accuracyMetrics = (
  actuals: readonly TimeSeriesPoint[],
  forecasts: readonly ForecastPoint[],
): KernelResult<ForecastAccuracy> => {
  const checkedActuals = validateSeries(actuals);
  if (!checkedActuals.ok) {
    return checkedActuals;
  }
  if (forecasts.length !== checkedActuals.value.length) {
    return err("precondition-violated", "actuals and forecasts must have equal lengths");
  }
  let absoluteErrorSum = 0;
  let squaredErrorSum = 0;
  let percentageErrorSum = 0;
  let zeroActualCount = 0;
  for (let index = 0; index < checkedActuals.value.length; index += 1) {
    const actual = checkedActuals.value[index];
    const forecast = forecasts[index];
    if (actual === undefined || forecast === undefined) {
      return err("precondition-violated", "forecast comparison index was missing");
    }
    if (actual.t !== forecast.t) {
      return err("precondition-violated", "actuals and forecasts must match time indices");
    }
    const forecastCheck = forecastValue(forecast.value);
    if (!forecastCheck.ok) {
      return forecastCheck;
    }
    const errorValue = actual.value - forecast.value;
    const absoluteError = Math.abs(errorValue);
    if (!finite(absoluteError)) {
      return err("numerical-instability", "forecast error was non-finite");
    }
    absoluteErrorSum += absoluteError;
    squaredErrorSum += errorValue * errorValue;
    if (actual.value === 0) {
      zeroActualCount += 1;
    } else {
      percentageErrorSum += Math.abs(errorValue / actual.value) * 100;
    }
  }
  const count = checkedActuals.value.length;
  const mae = absoluteErrorSum / count;
  const mse = squaredErrorSum / count;
  const rmse = Math.sqrt(mse);
  if (!finite(mae) || !finite(mse) || !finite(rmse)) {
    return err("numerical-instability", "forecast accuracy metric was non-finite");
  }
  const mape = zeroActualCount === 0 ? percentageErrorSum / count : null;
  if (mape !== null && !finite(mape)) {
    return err("numerical-instability", "forecast MAPE was non-finite");
  }
  return ok({ count, mae, mse, rmse, mape, zeroActualCount });
};

export const holdoutBacktest = (
  points: readonly TimeSeriesPoint[],
  config: BacktestMethodConfig,
): KernelResult<BacktestResult> => {
  const checked = validateSeries(points);
  if (!checked.ok) {
    return checked;
  }
  const start = backtestStartIndex(config);
  if (!start.ok) {
    return start;
  }
  if (checked.value.length <= start.value) {
    return err("precondition-violated", "series is too short for requested backtest");
  }
  const forecasts: ForecastPoint[] = [];
  const actuals: TimeSeriesPoint[] = [];
  for (let index = Number(start.value); index < checked.value.length; index += 1) {
    const train = checked.value.slice(0, index);
    const forecast = forecastOne(train, config);
    if (!forecast.ok) {
      return forecast;
    }
    const actual = checked.value[index];
    const predicted = forecast.value[0];
    if (actual === undefined || predicted === undefined) {
      return err("precondition-violated", "backtest comparison index was missing");
    }
    forecasts.push({ ...predicted, t: actual.t });
    actuals.push(actual);
  }
  const accuracy = accuracyMetrics(actuals, forecasts);
  if (!accuracy.ok) {
    return accuracy;
  }
  return ok({ forecasts, actuals, accuracy: accuracy.value });
};

const finite = (value: number): boolean => Number.isFinite(value);

const sameSpacing = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

const forecastHorizon = (input: HorizonInput): KernelResult<PositiveInteger> =>
  input.horizon === undefined ? ok(1 as PositiveInteger) : positiveInteger(input.horizon);

const period = (points: readonly TimeSeriesPoint[]): number => {
  if (points.length < 2) {
    return 1;
  }
  const first = points[0];
  const second = points[1];
  return first === undefined || second === undefined ? 1 : second.t - first.t;
};

const futureTime = (
  points: readonly TimeSeriesPoint[],
  step: number,
): KernelResult<TimeIndex> => {
  const last = points[points.length - 1];
  if (last === undefined) {
    return err("precondition-violated", "time series must contain at least one point");
  }
  return timeIndex(last.t + step * period(points));
};

const futureForecast = (
  points: readonly TimeSeriesPoint[],
  horizon: PositiveInteger,
  method: ForecastMethod,
  valueAt: (step: number) => number,
): KernelResult<readonly ForecastPoint[]> => {
  const forecasts: ForecastPoint[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const t = futureTime(points, step);
    if (!t.ok) {
      return t;
    }
    const value = forecastValue(valueAt(step));
    if (!value.ok) {
      return value;
    }
    forecasts.push({ t: t.value, value: value.value, method });
  }
  return ok(forecasts);
};

const constantForecast = (
  points: readonly TimeSeriesPoint[],
  horizon: PositiveInteger,
  method: ForecastMethod,
  value: number,
): KernelResult<readonly ForecastPoint[]> =>
  futureForecast(points, horizon, method, () => value);

const recursiveForecast = (
  points: readonly TimeSeriesPoint[],
  horizon: PositiveInteger,
  method: ForecastMethod,
  values: number[],
  nextValue: () => number,
): KernelResult<readonly ForecastPoint[]> => {
  const forecasts: ForecastPoint[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const t = futureTime(points, step);
    if (!t.ok) {
      return t;
    }
    const value = forecastValue(nextValue());
    if (!value.ok) {
      return value;
    }
    values.push(value.value);
    forecasts.push({ t: t.value, value: value.value, method });
  }
  return ok(forecasts);
};

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const tail = (values: readonly number[], length: number): readonly number[] =>
  values.slice(values.length - length);

const validateWeights = (
  weights: readonly number[],
): KernelResult<readonly number[]> => {
  if (weights.length === 0) {
    return err("precondition-violated", "weights must not be empty");
  }
  let total = 0;
  for (const weight of weights) {
    if (!finite(weight) || weight < 0) {
      return err("out-of-domain", "weights must be finite and non-negative");
    }
    total += weight;
  }
  if (total <= 0) {
    return err("precondition-violated", "weights must have a positive sum");
  }
  return ok([...weights]);
};

const sumWeights = (weights: readonly number[]): number =>
  weights.reduce((sum, weight) => sum + weight, 0);

const backtestStartIndex = (
  config: BacktestMethodConfig,
): KernelResult<PositiveInteger> => {
  switch (config.method) {
    case "moving-average":
      return positiveInteger(config.window);
    case "weighted-moving-average": {
      const weights = validateWeights(config.weights);
      if (!weights.ok) {
        return weights;
      }
      return positiveInteger(weights.value.length);
    }
    case "simple-exponential-smoothing":
      return ok(1 as PositiveInteger);
    case "holt-linear-trend":
      return ok(2 as PositiveInteger);
    case "seasonal-naive":
      return positiveInteger(config.seasonLength);
  }
};

const forecastOne = (
  points: readonly TimeSeriesPoint[],
  config: BacktestMethodConfig,
): KernelResult<readonly ForecastPoint[]> => {
  const horizon = 1 as PositiveInteger;
  switch (config.method) {
    case "moving-average":
      return movingAverage(points, { window: config.window, horizon });
    case "weighted-moving-average":
      return weightedMovingAverage(points, { weights: config.weights, horizon });
    case "simple-exponential-smoothing":
      return simpleExponentialSmoothing(points, { alpha: config.alpha, horizon });
    case "holt-linear-trend":
      return holtLinearTrend(points, {
        alpha: config.alpha,
        beta: config.beta,
        horizon,
      });
    case "seasonal-naive":
      return seasonalNaive(points, { seasonLength: config.seasonLength, horizon });
  }
};
