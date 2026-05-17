# core/linear-algebra · agent contract

## What this module is

The deterministic 2D linear algebra kernel for Paideia simulations: finite
vectors, 2x2 real matrices, matrix/vector transforms, and real eigenpairs. It
owns the recurring mathematics behind transformation, eigenvector, control,
PCA-intuition, vibration, and graphics containers so sims do not inline
slightly different matrix conventions.

## Public interface

Exports from `@paideia/linear-algebra`:

- `type Vector2 = readonly [x: number, y: number]`
- `type Matrix2 = readonly [readonly [a: number, b: number], readonly [c: number, d: number]]`
- `interface Eigenpair2 { readonly value: number; readonly vector: Vector2 }`
- `linearAlgebraTolerance: { default: number; zero: number; loose: number }`
- `vector2(x: number, y: number): KernelResult<Vector2>`
- `matrix2(a: number, b: number, c: number, d: number): KernelResult<Matrix2>`
- `add2(left: Vector2, right: Vector2): KernelResult<Vector2>`
- `subtract2(left: Vector2, right: Vector2): KernelResult<Vector2>`
- `scale2(vector: Vector2, scalar: number): KernelResult<Vector2>`
- `dot2(left: Vector2, right: Vector2): KernelResult<number>`
- `norm2(vector: Vector2): KernelResult<number>`
- `normalize2(vector: Vector2): KernelResult<Vector2>`
- `determinant2(matrix: Matrix2): KernelResult<number>`
- `trace2(matrix: Matrix2): KernelResult<number>`
- `transpose2(matrix: Matrix2): KernelResult<Matrix2>`
- `multiplyMatrixVector2(matrix: Matrix2, vector: Vector2): KernelResult<Vector2>`
- `multiplyMatrix2(left: Matrix2, right: Matrix2): KernelResult<Matrix2>`
- `eigenvalues2(matrix: Matrix2): KernelResult<readonly [number, number]>`
- `eigenvectors2(matrix: Matrix2): KernelResult<readonly [Eigenpair2, Eigenpair2]>`

## Invariants the caller must preserve

- Inputs represent real finite numbers. Constructors and operations return a
  `precondition-violated` error for `NaN`, infinities, or non-finite results.
- Matrices use row-major convention: `[[a, b], [c, d]]` maps `[x, y]` to
  `[a*x + b*y, c*x + d*y]`.
- `eigenvalues2` only returns real eigenvalues. Matrices with genuinely complex
  conjugate eigenvalues return an `out-of-domain` error.
- `eigenvectors2` returns two linearly independent real eigenvectors. Defective
  repeated-root matrices return a `precondition-violated` error; scalar
  matrices return the canonical basis because every vector is an eigenvector.

## What this module does NOT do

- Does **not** render transformations, grids, arrows, or eigenspaces.
- Does **not** perform symbolic linear algebra, matrix decompositions beyond
  real 2x2 eigenpairs, or arbitrary-dimensional operations.
- Does **not** own units. Inputs and outputs are unitless numbers; callers
  brand units at their own boundary when relevant.
- Does **not** memoise or keep hidden mutable global state.
- Does **not** special-case branch or curriculum audiences.

## When to consider this module

Use `core/linear-algebra` when a sim needs 2D vector arithmetic, 2x2 matrix
transforms, determinant/trace reasoning, or real eigenvectors. If you are about
to write a 2x2 transform or eigenvector routine inside a container, stop and
use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to public types, matrix
   conventions, eigenvalue ordering, or tolerance constants.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN`/`Infinity` instead of `KernelResult.err(...)`.
- Mutating vectors or matrices passed by the caller.
- Hidden caches or global configuration for tolerances.
- Branch-specific tolerance or behavior.
- Expanding to general matrix dimensions without a contract update.

## How the Anieyrudh Filter reads this module

The Filter checks that a simulation's displayed 2D transformation and
eigenvector claims match this module's matrix convention and real eigenpair
results within `linearAlgebraTolerance.default`. A visual that labels a vector
as an eigenvector while `A*v` is not parallel to `v` at the declared eigenvalue
is rejected.
