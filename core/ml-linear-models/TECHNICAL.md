# @paideia/ml-linear-models Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: point/model
types and pure kernel functions for univariate OLS fitting, prediction, and mean
squared error.

## Numerical model

```text
slope = sum((x_i - mean_x)(y_i - mean_y)) / sum((x_i - mean_x)^2)
intercept = mean_y - slope * mean_x
prediction = slope * x + intercept
MSE = mean((y_i - prediction_i)^2)
```

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Points and coefficients are finite | `finite` guards return `precondition-violated` |
| Fitting has at least two observations | `fitUnivariateLinearRegression` returns `precondition-violated` |
| Fitting has variation in `x` | `fitUnivariateLinearRegression` returns `out-of-domain` |
| Fit and model results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers formula examples, prediction, MSE, invalid input paths,
immutable results, and a property test that exact generated linear relationships
recover their slope and intercept.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add multivariate least squares only after a consuming container defines matrix
  shape and numerical-stability expectations.
- Add logistic regression in a separate narrow PR if a classification container
  needs it.
- Add regularisation only after a container defines penalty conventions.

## Anieyrudh Filter pass

- P0 issues checked: no ML framework dependency, no hidden randomness, no
  training loop, no branch-specific presets, no hidden mutable global state, no
  public `any`.
- P1 issues checked: public API is deliberately narrow, expected failures
  return `KernelResult.err`, coefficient semantics are documented, and fit
  results are immutable.
- High-bandwidth questions surfaced: multivariate regression, logistic
  regression, regularisation, model selection, and train/test splitting are
  intentionally deferred until consuming containers define the contract.
- Outcome: the kernel provides canonical closed-form linear-model numbers for
  ML teaching visuals.
