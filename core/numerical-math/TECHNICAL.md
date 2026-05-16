# @paideia/numerical-math technical notes

## Implementation

The kernel is dependency-free and deterministic. All algorithms sample scalar functions through one internal guard that converts thrown functions and non-finite outputs into `KernelResult` errors.

Implemented methods:

- Central-difference derivatives with Richardson variants.
- Composite trapezoid, Simpson, and five-point Gauss-Legendre integration.
- Left, right, and midpoint Riemann sums.
- Taylor polynomial construction from finite-difference derivatives up to degree 8.
- Ordinary least-squares linear regression for finite `[x, y]` points.

## Error contract

- Non-finite inputs, reversed bounds, invalid `n`, repeated regression `x` values, and unsupported Taylor degree return `precondition-violated`.
- Non-finite function samples and thrown function calls return `undefined-at-point`.
- Step sizes too small to perturb `x` return `numerical-instability`.

## Anieyrudh Filter pass

Diagnosis: calculus visuals can only be trusted if every slope, area, and approximation routes through a single deterministic numerical contract.

Falsifying scenario: a derivative or integral panel displaying a finite value while this package returns `undefined-at-point`, or diverging beyond `numericalTolerance.default` on documented smooth inputs, would invalidate the sim.

Boundary decision: this package owns numbers only; it does not render, infer pedagogy, cache hidden state, mutate input arrays, or mask caller-owned discontinuities.
