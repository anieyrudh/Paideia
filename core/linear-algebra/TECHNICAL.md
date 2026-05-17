# @paideia/linear-algebra Technical Notes

## Public Interface Summary

The package exports immutable tuple types for `Vector2` and `Matrix2`, an
`Eigenpair2` interface, tolerance constants, vector arithmetic, 2x2 matrix
operations, real eigenvalue calculation, and real two-vector eigenbasis
calculation.

All operations that can fail return `KernelResult<T>` from `@paideia/shared`.
No public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Vectors and matrices contain only finite real numbers | Constructors and every public operation validate inputs and return `precondition-violated` on `NaN` or infinities. |
| Matrix convention is row-major | Public contract, README example, and matrix-vector tests pin `[[a,b],[c,d]] * [x,y]`. |
| Zero vectors cannot be normalized | `normalize2` checks `linearAlgebraTolerance.zero` and returns `precondition-violated`. |
| Eigenvalues are real | `eigenvalues2` rejects negative discriminants below tolerance with `out-of-domain`. |
| `eigenvectors2` returns an independent real eigenbasis | Distinct eigenvalues get residual-checked normalized vectors; scalar matrices return the canonical basis; defective repeated roots return `precondition-violated`. |
| Results stay finite | Arithmetic outputs are revalidated before returning `ok(...)`. |
| Mathematical identities are stable | Tests cover distributive dot products, matrix composition over vectors, and determinant multiplicativity over sampled matrices. |

## Numerical Method

For a 2x2 row-major matrix `[[a,b],[c,d]]`, the characteristic polynomial is:

```text
lambda^2 - trace(A) * lambda + det(A) = 0
```

`eigenvalues2` evaluates the quadratic discriminant. Small negative
discriminants within `linearAlgebraTolerance.loose` are treated as zero to
avoid rejecting repeated real roots due to floating-point roundoff. Genuinely
negative discriminants return `out-of-domain` because this kernel intentionally
does not expose complex numbers.

`eigenvectors2` builds candidates from perpendicular rows of `A - lambda I`,
normalizes them, and keeps the candidate with the smallest residual
`||A*v - lambda*v||`. Residuals above `linearAlgebraTolerance.loose` return
`numerical-instability`.

## Dependency And License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

No external runtime dependency was added. The package therefore introduces no
new third-party license surface and does not require clean-room dependency
review.

## Anieyrudh Filter pass

- The kernel returns errors instead of invalid numeric claims for non-finite
  inputs, complex eigenvalues, zero-vector normalization, and defective
  repeated-root matrices.
- Transformation visuals can cite the row-major convention and validate
  displayed arrows with `multiplyMatrixVector2`.
- Eigenvector visuals can be checked by comparing `A*v` with `lambda*v` within
  `linearAlgebraTolerance.default`; the implementation also residual-checks the
  vectors it returns.
- The property-style tests pin algebraic laws that a misleading simulation
  would otherwise be able to violate silently.
