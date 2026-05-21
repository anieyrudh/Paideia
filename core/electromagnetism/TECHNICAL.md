# @paideia/electromagnetism · Technical Notes

## Public Interface Summary

The package exports branded charge, potential, and field-strength types plus
pure helpers for point-charge electric field, force, potential, potential
energy, and a composed point-charge model.

Every public operation that can fail returns `KernelResult`.

## Invariant Enforcement

| Invariant | Enforcement |
| --- | --- |
| Inputs are SI values | Public type names and README examples use C, m, N/C, V, and J |
| Charges and radii must be finite | Runtime guards return `precondition-violated` |
| The source point is undefined | `r = 0` without a display clamp returns `undefined-at-point` |
| Near-source display clamps are explicit | Optional `minRadiusMetres` returns zero field/potential only inside that caller-owned clamp |
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

## Anieyrudh Filter pass

P0 issues resolved:

- Electric Fields originally computed `E = kQ/r^2`, `F = qE`, `V = kQ/r`,
  and `U = qV` inside the sim package. That was moved into this kernel so the
  sim is responsible for state, rendering, and student-facing explanation only.

P1 issues resolved:

- Near-source behaviour is explicit through `minRadiusMetres`; unclamped source
  points return `undefined-at-point` instead of silently producing `NaN` or
  infinity.
- Property tests assert inverse-square scaling and sign-direction behaviour.

High-bandwidth questions surfaced:

- Future capacitance and electromagnetism containers should decide whether this
  package expands to distributed-charge and field-line helpers or whether those
  deserve separate kernels.

Core-change traceability: additive electromagnetism kernel tracked in
[#130](https://github.com/anieyrudh/Paideia/issues/130).
