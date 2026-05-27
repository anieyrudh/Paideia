# @paideia/vector-calculus technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: 2D point,
vector, and matrix records; derivative/grid options; gradient, Hessian,
divergence, curl, rectangular integral, line-integral, scalar path-integral, and
vector-field sampling functions.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Coordinates are finite | `point2`, `validatePoint`, and sample guards. |
| Fields/curves cannot return `NaN` or `Infinity` | `sampleScalar`, `sampleVector`, and `sampleCurve`. |
| User-function exceptions are not swallowed | sampling wrappers return `undefined-at-point` with `cause`. |
| Derivative step is positive and usable | `usableStep`. |
| Rectangles have increasing finite bounds | `validateRect`. |
| Integration rule is valid at runtime | `validateIntegrationRule`. |
| Grid/line counts are positive integers | `positiveInteger`. |
| Inputs are not mutated | All outputs allocate new readonly records. |

## Error Model

- `precondition-violated`: invalid point, rectangle, step, bounds, or sample
  count.
- `undefined-at-point`: a user function throws or returns a non-finite value.
- `numerical-instability`: derivative step cannot change the sampled point or
  an accumulated result becomes non-finite.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Function3D`, `VectorField2D`, `ParametricCurve2D`,
  `Rect`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime vector-calculus package is bundled.

## Numerical Notes

Central differences are intentionally used as reference calculations for
learning simulations, not as high-precision scientific computing routines.
Line integrals use midpoint samples with a finite-difference tangent for the
displayed curve. Rectangular double integrals use tensor-product grids and
return per-sample values, weights, and contributions for renderer evidence.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden sampled-field state. Resolution: all functions are pure and
  allocate output records; there is no module-level mutable cache.
- P0 check: silent non-finite output. Resolution: every scalar/vector/curve
  sample is wrapped and non-finite results return `KernelResult.err(...)`.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: visible gradient/curl/integral could disagree with formulas.
  Resolution: output records include the sampled point/path/grid values used to
  compute the numerical readouts, so renderers can display the same evidence.
- P1 check: JS or casted callers could pass an unsupported integration rule.
  Resolution: `doubleIntegralRect` runtime-validates `opts.rule`.
- P1 check: curve/vector outputs could contain extra components. Resolution:
  point/vector validation requires exactly two finite coordinates at runtime.
- P1 check: symbolic-calculus scope creep. Resolution: contract explicitly
  limits this package to numerical kernels and leaves symbolic work out of
  scope.

High-bandwidth questions surfaced:

- Should surface rendering live here? No; pair these records with
  `core/plotting`, `core/charting`, or `core/three-scene`.

P2 cleanup:

- Deferred: add `core/vector-calculus` to `docs/core-modules.md` in a broader
  core catalogue update pass.
