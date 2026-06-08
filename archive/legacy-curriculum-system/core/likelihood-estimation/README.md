# @paideia/likelihood-estimation

Deterministic likelihood and maximum-likelihood helpers for introductory
Paideia simulations.

Use this package when a sim needs shared Bernoulli, Poisson, or normal
known-sigma likelihood values for formula panels and likelihood-curve visuals.

## Example

```ts
import { bernoulliMaximumLikelihood } from "@paideia/likelihood-estimation";

const result = bernoulliMaximumLikelihood({
  successes: 7,
  trials: 10,
  candidateProbabilities: [0.2, 0.5, 0.7, 0.9],
});

if (result.ok) {
  console.log(result.value.estimate); // 0.7
}
```

The call returns a `KernelResult`. Expected invalid inputs, such as a probability
outside `[0, 1]` or a zero Poisson-rate candidate, return `err(...)` rather than
throwing.

## Scope

This package owns closed-form one-parameter likelihood helpers only. It does not
fit arbitrary distributions, compute confidence intervals, run Bayesian
inference, render charts, or choose curriculum-specific examples.
