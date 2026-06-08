# @paideia/time-series technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded time
indices and values, deterministic forecasting methods, accuracy metrics, and
one-step holdout backtests.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Time indices and observations are finite | `timeIndex`, `observation`, and `validateSeries`. |
| Time indices are strictly increasing and evenly spaced | `validateSeries` checks monotonicity and spacing tolerance. |
| Horizons, windows, and seasonal lengths are positive safe integers | `positiveInteger` and method precondition guards. |
| Smoothing factors are in `[0, 1]` | `smoothingFactor`. |
| Weighted moving-average weights are usable | `validateWeights` requires finite, non-negative weights with positive sum. |
| Moving-average windows and seasonal periods fit the training series | Method-specific length guards. |
| Accuracy metrics compare matching timestamps | `accuracyMetrics` checks equal length and exact time-index matches. |
| Public results are finite | `forecastValue` and metric finite guards wrap all calculated outputs. |
| Inputs are not mutated | Functions copy or allocate output arrays and never mutate caller arrays. |

## Error Model

- `out-of-domain`: non-finite numeric values, invalid smoothing factors,
  invalid weights, or non-finite calculated forecasts.
- `precondition-violated`: empty series, irregular time indices, invalid
  positive integers, windows longer than available history, mismatched accuracy
  comparisons, or too-short backtests.
- `numerical-instability`: non-finite intermediate states or error metrics.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime forecasting package is bundled.

## Numerical Notes

Moving average and weighted moving average recursively feed each forecast back
into the future working series when `horizon > 1`. Simple exponential smoothing
returns the final smoothed level for every future period. Holt linear trend uses
the standard additive level/trend recursion. Seasonal naive forecasts repeat the
last complete season.

`accuracyMetrics` reports MAPE as `null` when any actual value is zero; this is
intentional because percentage error would be undefined.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: non-finite forecast values. Resolution: all method outputs pass
  through `forecastValue`; non-finite intermediate Holt state returns
  `numerical-instability`.
- P0 check: hidden global model state. Resolution: each function is pure and
  allocates local arrays only.
- P0 check: misleading MAPE with zero actuals. Resolution: `accuracyMetrics`
  sets `mape` to `null` and reports `zeroActualCount`.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: irregular period data silently accepted. Resolution:
  `validateSeries` rejects non-increasing and unevenly spaced time indices.
- P1 check: forecast comparison on mismatched timestamps. Resolution:
  `accuracyMetrics` requires exact time-index matches.
- P1 check: weights creating divide-by-zero. Resolution: `validateWeights`
  rejects empty arrays, negative/non-finite values, and zero total weight.

High-bandwidth questions surfaced:

- Should future analytics containers need ARIMA or probabilistic forecast
  intervals? Deferred; this kernel intentionally covers deterministic teaching
  baselines only.

P2 cleanup:

- Add `core/time-series` to `docs/core-modules.md` during the broader core
  catalogue refresh.
