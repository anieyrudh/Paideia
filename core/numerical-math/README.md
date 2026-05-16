# @paideia/numerical-math

Deterministic numerical-analysis kernels for Paideia calculus and data sims.

The package works on pure `Function2D` callables and finite point arrays. It returns `KernelResult` for expected numerical failures instead of throwing or leaking `NaN` into downstream visualizations.

## Public API

- `derivative(f, x, h?)`
- `derivativeAt(f, x, opts?)`
- `secantSlope(f, a, b)`
- `integral(f, bounds, opts?)`
- `riemannSum(f, bounds, n, rule)`
- `taylor(f, x0, n)`
- `linearRegression(points)`
- `numericalTolerance`

## Defaults

- `derivative` uses a central difference with adaptive step size and Richardson extrapolation.
- `integral` defaults to composite Simpson with `n = 256`.
- Reverse integration bounds are rejected. Callers that want signed reverse integrals should flip the bounds and negate the result explicitly.
