# @paideia/time-series

Pure forecasting helpers for Paideia analytics, operations, and planning
simulations.

Use this package when a container needs moving averages, exponential smoothing,
trend projection, seasonal naive forecasts, forecast-error metrics, or rolling
holdout backtests.

```ts
import {
  movingAverage,
  observation,
  positiveInteger,
  timeIndex,
} from "@paideia/time-series";

const points = [10, 12, 15, 16].map((value, index) => {
  const t = timeIndex(index + 1);
  const y = observation(value);
  if (!t.ok || !y.ok) {
    throw new Error("invalid series");
  }
  return { t: t.value, value: y.value };
});

const window = positiveInteger(2);

if (window.ok) {
  const forecast = movingAverage(points, { window: window.value });
  console.log(forecast);
}
```

## Assumptions

- Time indices are numeric periods and must be strictly increasing and evenly
  spaced.
- The package does not parse dates or calendars. A period can mean days, weeks,
  months, terms, or lessons as long as the caller is consistent.
- Forecast horizons, windows, and season lengths are positive safe integers.
- Smoothing factors are in `[0, 1]`.
- MAPE is returned as `null` whenever an actual value is zero.
- Forecasts are deterministic and local to the function call; the kernel owns no
  random state, cache, or external data source.
