# @paideia/ml-linear-models

Deterministic teaching-scale linear-model calculations for Paideia simulations.

Use this package when a sim needs shared numbers for univariate ordinary least
squares, linear prediction, or mean squared error.

## Example

```ts
import { fitUnivariateLinearRegression } from "@paideia/ml-linear-models";

const fit = fitUnivariateLinearRegression({
  points: [
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 5 },
  ],
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as non-finite
points or no variation in `x`, return `err(...)` rather than throwing.

## Scope

This package models closed-form univariate OLS only. It does not implement
ML frameworks, multivariate regression, classification, regularisation, or
training loops.
