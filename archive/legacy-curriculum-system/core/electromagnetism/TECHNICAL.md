# @paideia/electromagnetism · Technical Notes

## Public Interface Summary

The package exports branded charge, potential, field-strength, capacitance,
surface-density, line-density, and electric-flux types plus pure helpers for
point-charge electric field, force, potential, potential energy, ideal
parallel-plate capacitors, Gauss-law symmetric flux surfaces, induction, waves,
and composed models.

Every public operation that can fail returns `KernelResult`.

## Invariant Enforcement

| Invariant | Enforcement |
| --- | --- |
| Inputs are SI values | Public type names and README examples use C, C/m, C/m^2, m, m^2, N/C, V, V m, and J |
| Charges and radii must be finite | Runtime guards return `precondition-violated` |
| The source point is undefined | `r = 0` without a display clamp returns `undefined-at-point` |
| Near-source display clamps are explicit | Optional `minRadiusMetres` returns zero field/potential only inside that caller-owned clamp |
| Gauss-law flux sign is explicit | `electricFluxThroughSurface` accepts 0 through 180 degrees to the surface normal |
| Symmetric Gaussian surfaces stay ideal | `gaussLawSymmetricFieldModel` only supports spherical, cylindrical, and planar symmetry and rejects non-positive geometry |
| Derived values must stay finite | Runtime guards return `numerical-instability` |
| Inputs are not mutated | Vectors are readonly tuples and outputs allocate new tuples |

## Dependency And License Notes

Runtime dependencies:

- `@paideia/shared` (`workspace:*`) for `KernelResult`, branded units, and result constructors.
- `@paideia/linear-algebra` (`workspace:*`) for vector validation, normalisation, scaling, and norms.

No external runtime dependencies are introduced. No GPL, AGPL, LGPL, SSPL,
BUSL, or Commons-Clause dependency is bundled.

## Numerical Notes

The package uses `k = 8.99e9` for the Coulomb constant to match A-Level
rounding conventions while keeping all inputs and outputs in SI units. The
optional `minRadiusMetres` clamp exists for visual field plots near the source;
without it, `r = 0` is rejected.

Gauss-law helpers use `epsilon_0 = 8.8541878128e-12 F/m`. Symmetric field
models return signed field values: positive charge density means outward field,
negative density means inward field relative to the chosen Gaussian surface.

## Anieyrudh Filter pass

P0 issues resolved:

- Electric Fields originally computed `E = kQ/r^2`, `F = qE`, `V = kQ/r`,
  and `U = qV` inside the sim package. That was moved into this kernel so the
  sim is responsible for state, rendering, and student-facing explanation only.
- The Gauss-law queue item was blocked on missing shared symmetric-flux logic.
  This extension adds branch-agnostic helpers for `Phi_E = EA cos(theta)`,
  `Phi_E = Q_enclosed / epsilon_0`, and spherical/cylindrical/planar symmetry
  so the future container does not inline reusable electromagnetism.

P1 issues resolved:

- Near-source behaviour is explicit through `minRadiusMetres`; unclamped source
  points return `undefined-at-point` instead of silently producing `NaN` or
  infinity.
- Property tests assert inverse-square scaling, sign-direction behaviour, and
  Gauss-law flux invariance across Gaussian sphere radius.

High-bandwidth questions surfaced:

- Future electromagnetism containers should keep field-line rendering in sims or
  plotting kernels; this package owns scalar/vector formulae only.

Core-change traceability: additive electromagnetism kernel tracked in
[#130](https://github.com/anieyrudh/Paideia/issues/130) and Gauss-law extension
tracked in [#211](https://github.com/anieyrudh/Paideia/issues/211).
