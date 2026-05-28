# @paideia/statistical-inference

Deterministic introductory statistical-inference calculations for Paideia
simulations.

Use this package when a sim needs shared numbers for confidence intervals,
standard errors, margins of error, or standardized effect diagnostics.

## Example

```ts
import { meanConfidenceIntervalKnownSigma } from "@paideia/statistical-inference";

const interval = meanConfidenceIntervalKnownSigma({
  sampleMean: 10,
  populationStandardDeviation: 2,
  sampleSize: 25,
  confidenceLevel: 0.95,
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero
standard deviation or unsupported confidence levels, return `err(...)` rather
than throwing.

## Scope

This package models closed-form teaching diagnostics. It does not fit
distributions, compute exact p-values, run bootstrap simulations, or choose
hypothesis-test wording.
