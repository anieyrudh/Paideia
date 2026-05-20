# @paideia/probability-stats

Probability and descriptive statistics kernels for Paideia simulations.

Use this package when a shared sim needs finite discrete distributions, expected value, variance, summary statistics, quantiles, z-scores, or histogram bins. It is pure TypeScript and returns `KernelResult` values instead of throwing for expected domain failures.

## Usage

```ts
import {
  bayesPositiveEvidence,
  expectedValue,
  histogram,
  normalizeDistribution,
  samplingDistributionOfMean,
  variance,
} from "@paideia/probability-stats";
import { probability } from "@paideia/shared";

const distribution = normalizeDistribution([
  { id: "low", weight: 1, value: 0 },
  { id: "high", weight: 3, value: 10 },
]);

if (distribution.ok) {
  const mean = expectedValue(distribution.value);
  const spread = variance(distribution.value);
  const bins = histogram([0, 2, 2, 3, 5], { binCount: 5 });
  const sampleMeans = samplingDistributionOfMean({
    distribution: distribution.value,
    thresholdSamples: [[0.1, 0.7, 0.8], [0.2, 0.3, 0.9]],
  });
  // mean, spread, and bins are KernelResult values.
}

const prior = probability(0.1);
const sensitivity = probability(0.95);
const specificity = probability(0.9);
if (prior.ok && sensitivity.ok && specificity.ok) {
  const posterior = bayesPositiveEvidence({
    prior: prior.value,
    sensitivity: sensitivity.value,
    specificity: specificity.value,
  });

  // posterior is a KernelResult value.
}
```

## Boundaries

This package does not render charts, run random-number generators, or fit continuous distributions. Pair the outputs with `@paideia/charting` for visuals. For sampling distributions, callers provide explicit random thresholds; this kernel maps them to outcomes and statistics deterministically.
