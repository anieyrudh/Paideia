# core/time-series - agent contract

## What this module is

Pure time-series forecasting kernels for business analytics, operations,
economics, and measurement simulations. It owns deterministic reference
forecasts, rolling accuracy metrics, and holdout backtests for small educational
series. It returns readonly records only; chart rendering, learner controls,
scenario presets, stochastic models, and domain narratives live elsewhere.

All periods are caller-defined. If a container uses weeks, then forecast
horizons and seasonal periods are weeks. The kernel does not infer calendars or
convert between time units.

## Public interface

Exports from `@paideia/time-series`:

- `TimeIndex = Brand<number, "TimeSeries.TimeIndex">`
- `Observation = Brand<number, "TimeSeries.Observation">`
- `ForecastValue = Brand<number, "TimeSeries.ForecastValue">`
- `SmoothingFactor = Brand<number, "TimeSeries.SmoothingFactor">`
- `PositiveInteger = Brand<number, "TimeSeries.PositiveInteger">`
- `TimeSeriesPoint = { t: TimeIndex; value: Observation }`
- `ForecastPoint = { t: TimeIndex; value: ForecastValue; method: ForecastMethod }`
- `ForecastMethod = "moving-average" | "weighted-moving-average" | "simple-exponential-smoothing" | "holt-linear-trend" | "seasonal-naive"`
- `ForecastAccuracy = { count: number; mae: number; mse: number; rmse: number; mape: number | null; zeroActualCount: number }`
- `BacktestMethodConfig = { method: "moving-average"; window: PositiveInteger } | { method: "weighted-moving-average"; weights: readonly number[] } | { method: "simple-exponential-smoothing"; alpha: SmoothingFactor } | { method: "holt-linear-trend"; alpha: SmoothingFactor; beta: SmoothingFactor } | { method: "seasonal-naive"; seasonLength: PositiveInteger }`
- `BacktestResult = { forecasts: readonly ForecastPoint[]; actuals: readonly TimeSeriesPoint[]; accuracy: ForecastAccuracy }`
- `timeIndex(value: number): KernelResult<TimeIndex>`
- `observation(value: number): KernelResult<Observation>`
- `forecastValue(value: number): KernelResult<ForecastValue>`
- `smoothingFactor(value: number): KernelResult<SmoothingFactor>`
- `positiveInteger(value: number): KernelResult<PositiveInteger>`
- `validateSeries(points: readonly TimeSeriesPoint[]): KernelResult<readonly TimeSeriesPoint[]>`
- `movingAverage(points: readonly TimeSeriesPoint[], input: { window: PositiveInteger; horizon?: PositiveInteger }): KernelResult<readonly ForecastPoint[]>`
- `weightedMovingAverage(points: readonly TimeSeriesPoint[], input: { weights: readonly number[]; horizon?: PositiveInteger }): KernelResult<readonly ForecastPoint[]>`
- `simpleExponentialSmoothing(points: readonly TimeSeriesPoint[], input: { alpha: SmoothingFactor; horizon?: PositiveInteger }): KernelResult<readonly ForecastPoint[]>`
- `holtLinearTrend(points: readonly TimeSeriesPoint[], input: { alpha: SmoothingFactor; beta: SmoothingFactor; horizon?: PositiveInteger }): KernelResult<readonly ForecastPoint[]>`
- `seasonalNaive(points: readonly TimeSeriesPoint[], input: { seasonLength: PositiveInteger; horizon?: PositiveInteger }): KernelResult<readonly ForecastPoint[]>`
- `accuracyMetrics(actuals: readonly TimeSeriesPoint[], forecasts: readonly ForecastPoint[]): KernelResult<ForecastAccuracy>`
- `holdoutBacktest(points: readonly TimeSeriesPoint[], config: BacktestMethodConfig): KernelResult<BacktestResult>`

## Invariants the caller must preserve

- Time indices and observed values must be finite.
- Time indices must be strictly increasing and evenly spaced.
- Forecast horizons, windows, and seasonal lengths must be positive safe
  integers.
- Moving-average windows and seasonal periods must fit inside the available
  training series.
- Smoothing factors must be finite and satisfy `0 <= factor <= 1`.
- Weighted moving-average weights must be finite, non-negative, and have a
  strictly positive sum.
- Accuracy metrics compare matching time indices.
- Public results must never contain `NaN` or `Infinity`.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render line charts, confidence bands, or dashboards.
- Does not parse dates, infer calendars, adjust holidays, or convert time units.
- Does not own random state, stochastic simulation, ARIMA, machine learning, or
  server-side model fitting.
- Does not fetch external data or cache forecasts globally.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/time-series` when a sim needs moving averages, exponential smoothing,
trend projection, seasonal naive forecasts, forecast-error metrics, or rolling
backtests. If a forecasting or aggregate-planning sim is about to inline MAE,
RMSE, MAPE, smoothing, or seasonal-repeat logic, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formulas, validation behavior, or public types.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Silently accepting irregular or duplicate time indices.
- Mutating caller-owned series arrays or point objects.
- Hidden global caches, clock reads, or random state.
- Treating MAPE as finite when actual values include zero.
- Branch-specific defaults (`if SUTD then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed forecasts match this kernel: forecast lines use
the selected method and parameters; error readouts compare the same timestamps;
MAPE is marked unavailable when actuals are zero; and forecast visuals make the
last observation, forecast horizon, and error units legible to students.
