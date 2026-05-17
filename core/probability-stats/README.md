# @paideia/probability-stats

Probability and descriptive statistics kernels for Paideia simulations.

Use this package when a shared sim needs finite discrete distributions, expected value, variance, summary statistics, quantiles, z-scores, or histogram bins. It is pure TypeScript and returns `KernelResult` values instead of throwing for expected domain failures.

## Usage

```ts
import {
  expectedValue,
  histogram,
  normalizeDistribution,
  variance,
} from "@paideia/probability-stats";

const distribution = normalizeDistribution([
  { id: "low", weight: 1, value: 0 },
  { id: "high", weight: 3, value: 10 },
]);

if (distribution.ok) {
  const mean = expectedValue(distribution.value);
  const spread = variance(distribution.value);
  const bins = histogram([0, 2, 2, 3, 5], { binCount: 5 });

  // mean, spread, and bins are KernelResult values.
}
```

## Boundaries

This package does not render charts, draw histograms, run random simulations, or fit continuous distributions. Pair the outputs with `@paideia/charting` for visuals and keep caller-owned randomness outside this kernel.
