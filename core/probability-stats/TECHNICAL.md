# @paideia/probability-stats · Technical Notes

## Public Interface Summary

The package exports readonly distribution/data types plus pure functions for:

- normalising weighted finite outcomes into branded probabilities
- expected value and variance for finite discrete distributions
- descriptive summaries with sample or population variance
- linear-interpolated quantiles
- z-scores
- fixed-width histogram bins and densities
- positive-evidence Bayes updates by normalising true-positive and false-positive routes

Every public operation that can fail returns `KernelResult`.

## Invariant Enforcement

| Invariant | Enforcement |
| --- | --- |
| Weights must be finite and non-negative | `normalizeDistribution` checks every outcome before producing probabilities |
| Total distribution mass must be positive | `normalizeDistribution` returns `out-of-domain` for zero total weight |
| Distribution probabilities must be in `[0, 1]` and sum to 1 | `validateDistribution` reuses `@paideia/shared` `probability()` and checks total mass against `probabilityStatsTolerance.default` |
| Numeric observations must be finite | Shared finite guard across summaries, quantiles, histograms, and z-scores |
| Sample variance needs at least two observations | `summarize` rejects singleton samples unless `variance: "population"` is requested |
| Histogram bins cover a valid domain | `histogram` checks `min < max`, positive integer `binCount`, and every value within the selected domain |
| Bayes positive evidence conserves probability mass | `bayesPositiveEvidence` brands all input probabilities, computes the two evidence routes, and reuses `normalizeDistribution` for posterior mass |
| Inputs are not mutated | Sorting uses copies; binning and normalisation allocate new arrays |

## Dependency And License Notes

Runtime dependencies:

- `@paideia/shared` (`workspace:*`) for `KernelResult`, `Probability`, `Interval`, and result constructors.

No external runtime dependencies are introduced. No GPL, AGPL, LGPL, SSPL, BUSL, or Commons-Clause dependency is bundled.

## Numerical Notes

`summarize` uses Welford's online update to reduce cancellation for variance while still returning deterministic results for a fixed input order. `quantile` uses the common linear interpolation position `p * (n - 1)`. Histogram density is `count / (values.length * binWidth)`, so summing `density * binWidth` over all bins equals 1 for values inside the domain.

## Anieyrudh Filter pass

The Filter should reject any sim that displays probability mass, expected value, variance, or histogram density inconsistent with this package. This implementation gives the Filter concrete probes:

- mass conservation: normalised distributions, Bayes evidence routes, and validated distributions sum to 1 within `probabilityStatsTolerance.default`
- non-negative spread: generated distribution tests assert variance is never negative
- order independence: summary tests assert reordering observations preserves mean and variance
- visual honesty: histogram tests assert integrated density is 1 over the declared domain
