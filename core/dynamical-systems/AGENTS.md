# core/dynamical-systems · agent contract

## What this module is
The deterministic dynamical systems kernel for Paideia simulations. It owns
continuous-time vector-field stepping, trajectory generation, discrete map
iteration, local Jacobian approximation, and two-dimensional linear stability
classification. It returns numbers and immutable state snapshots only: no
rendering, no React state, no animation loop, and no persistence.

## Public interface
Exports from `@paideia/dynamical-systems`:

- `dynamicalSystemTolerance: { default: number; loose: number; jacobian: number }`
- `type StateVector = readonly number[]`
- `type VectorField = (state: StateVector, t: number) => StateVector`
- `type StateMap = (state: StateVector, stepIndex: number) => StateVector`
- `type IntegrationMethod = "euler" | "midpoint" | "rk4"`
- `type TrajectoryPoint = { readonly t: number; readonly state: StateVector }`
- `type OrbitPoint = { readonly step: number; readonly state: StateVector }`
- `type Matrix2x2 = readonly [readonly [number, number], readonly [number, number]]`
- `type Eigenvalue2D = { readonly kind: "real"; readonly lambda1: number; readonly lambda2: number } | { readonly kind: "complex"; readonly real: number; readonly imaginaryMagnitude: number }`
- `type EquilibriumKind = "stable-node" | "unstable-node" | "saddle" | "stable-spiral" | "unstable-spiral" | "center" | "degenerate"`
- `type LinearStability2D = { readonly trace: number; readonly determinant: number; readonly discriminant: number; readonly eigenvalues: Eigenvalue2D; readonly kind: EquilibriumKind }`
- `stepFlow(field: VectorField, state: StateVector, opts: { readonly dt: number; readonly t?: number; readonly method?: IntegrationMethod; readonly maxNorm?: number }): KernelResult<StateVector>`
- `integrateFlow(field: VectorField, initialState: StateVector, opts: { readonly dt: number; readonly steps: number; readonly t0?: number; readonly method?: IntegrationMethod; readonly maxNorm?: number }): KernelResult<readonly TrajectoryPoint[]>`
- `iterateMap(map: StateMap, initialState: StateVector, opts: { readonly steps: number; readonly maxNorm?: number }): KernelResult<readonly OrbitPoint[]>`
- `jacobian2D(field: VectorField, at: readonly [number, number], opts?: { readonly t?: number; readonly h?: number }): KernelResult<Matrix2x2>`
- `linearVectorField2D(matrix: Matrix2x2): KernelResult<VectorField>`
- `classifyLinear2D(matrix: Matrix2x2): KernelResult<LinearStability2D>`

## Invariants the caller must preserve
- `field` and `map` are pure functions. Stateful or side-effecting functions
  are undefined behaviour.
- All coordinates and time values are finite real numbers.
- `dt` is finite and non-zero. Negative `dt` is allowed for explicit backward
  integration.
- `steps` is a non-negative integer. Step zero returns the initial snapshot only.
- Vector fields and maps must return the same state dimension they receive.
- The caller chooses a `dt` that is educationally defensible for the displayed
  system. This kernel reports non-finite or exploding states, but it cannot
  prove that a coarse step size is conceptually adequate.

## What this module does NOT do
- Does **not** solve stiff systems adaptively or claim error bounds for arbitrary
  nonlinear systems.
- Does **not** render phase portraits, streamlines, charts, or controls. Pair
  with `core/plotting`, `core/charting`, or `core/ui-sim`.
- Does **not** implement symbolic linearisation.
- Does **not** persist trajectory state or memoise through hidden global caches.
- Does **not** branch by curriculum, audience, or institution.

## When to consider this module
Use `core/dynamical-systems` when a simulation needs to step an ODE, compare
Euler/midpoint/RK4 behaviour, iterate a logistic-style map, compute a local
Jacobian for a two-dimensional system, construct a vector field from a planar
linear system matrix, or classify a planar linear equilibrium. If a sim is about
stock-flow diagrams rather than state-space dynamics, use or extend the future
`core/systems-dynamics` package instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer.
2. Add tests showing old and new behaviour for at least one continuous flow and
   one discrete map if the public API changes.
3. Use `core!:` commit prefix for any breaking change to method defaults,
   tolerance constants, or classification labels.

## Anti-patterns (will be rejected in PR review)
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned state arrays.
- Hiding simulation state in module-level caches or counters.
- Adding an adaptive solver dependency without a license and clean-room review.
- Rendering arrows or trajectories directly from this package.

## How the Anieyrudh Filter reads this module
The Filter checks that a sim's displayed trajectory, orbit, or stability label
matches this kernel's returned snapshots and classification. A phase portrait
whose visible equilibrium type diverges from `classifyLinear2D(...)`, or whose
observed path bypasses `integrateFlow(...)` while claiming RK4, is rejected.
