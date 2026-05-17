# @paideia/dynamical-systems Technical Notes

This package implements the `core/dynamical-systems` kernel contract. It is a
pure TypeScript module with no runtime dependencies beyond `@paideia/shared`.

## Public interface

The public API is exactly the surface listed in `AGENTS.md`: state vector and
vector-field types, trajectory/orbit snapshots, `stepFlow`, `integrateFlow`,
`iterateMap`, `jacobian2D`, `classifyLinear2D`, stability result types, and
`dynamicalSystemTolerance`.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Finite state, time, and matrix values | Runtime guards return `precondition-violated`. |
| `dt` is finite and non-zero | Runtime guard before stepping. |
| `steps` is a non-negative integer | Runtime guard before trajectory/orbit allocation. |
| Vector fields and maps preserve dimension | Evaluation wrapper checks returned length. |
| Functions do not leak thrown singularities | Evaluation wrappers convert throws to `undefined-at-point`. |
| Exploding trajectories are not silently emitted | `maxNorm` guard returns `numerical-instability`. |
| Caller-owned arrays are not mutated | Inputs are copied and outputs are frozen snapshots. |
| 2D stability labels follow the linear trace/determinant test | Unit tests cover each classification branch. |

## Numerical notes

`stepFlow` offers fixed-step explicit Euler, midpoint, and RK4. This is
intentional for educational simulations where learners compare methods and
step sizes directly. The kernel does not adapt `dt`, estimate global truncation
error, or solve stiff systems.

`jacobian2D` uses central differences with
`sqrt(Number.EPSILON) * max(1, |x|, |y|)` by default. Callers can pass `h` when
a sim needs a visibly explained perturbation size.

## Dependency and license notes

No new third-party runtime dependency was added. The only runtime dependency is
`@paideia/shared`, which is workspace-local. Tests use the repo-standard Vitest
dev dependency.

## Anieyrudh Filter pass

### P0 issues

- Potential P0: a sim could display a trajectory with mutable snapshots that
  later drift from the learner's observed state. Resolution: all returned
  vectors, trajectory arrays, and orbit arrays are copied and frozen.
- Potential P0: a vector field singularity could become `NaN` and still be
  plotted. Resolution: non-finite outputs and thrown fields return
  `KernelResult.err(...)`.
- Potential P0: planar stability labels could be invented by a renderer instead
  of derived from the system matrix. Resolution: `classifyLinear2D` owns the
  trace/determinant/discriminant classification and tests cover every label.

### Status

Filter pass recorded as green for this kernel implementation: no open P0s.
