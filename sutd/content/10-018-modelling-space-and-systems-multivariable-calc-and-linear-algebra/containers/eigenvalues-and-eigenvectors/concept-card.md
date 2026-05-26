---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: eigenvalues-and-eigenvectors
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.018 Modelling Space and Systems / Linear Algebra
prerequisites:
  - determinant-and-trace
  - vector-transformations
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Eigenvalues and Eigenvectors

An eigenvalue of a square matrix `A` is a number `lambda` for which the equation `A v = lambda v` has a non-zero solution `v`. The non-zero solution is the associated eigenvector. For a 2x2 real matrix the two eigenvalues are the roots of the characteristic polynomial

```latex
\lambda^2 - (\operatorname{tr} A)\lambda + \det A = 0
```

This single polynomial connects trace, determinant, and eigenvalues. Solving it gives `lambda_{1,2} = (T plus or minus sqrt(T^2 - 4D)) / 2`.

## First-Principles Explanation

Trace and determinant compress the four entries of `A` into the eigenvalue sum and product. Vieta's formulas turn that into a quadratic with the eigenvalues as roots. The discriminant `T^2 - 4D` chooses what kind of solutions are possible: two distinct real eigenvalues, one repeated real eigenvalue, or a complex conjugate pair.

For each real eigenvalue, the eigenvectors are the non-zero solutions of `(A - lambda I) v = 0`. Geometrically this is the kernel of a singular 2x2 matrix; it is a line through the origin in 2D, and any non-zero point on that line is an eigenvector with that eigenvalue.

## Canonical Example

For `A = [[3, 1], [0, 2]]`, trace is 5, determinant is 6, discriminant is `25 - 24 = 1`. The two eigenvalues are `(5 plus or minus 1) / 2`, giving `lambda_1 = 3` and `lambda_2 = 2`. They match the diagonal entries because `A` is upper-triangular.

Plugging in `lambda_1 = 3`, the eigenspace is the kernel of `A - 3I = [[0, 1], [0, -1]]`, which is the x-axis. So `v_1 = (1, 0)` is an eigenvector for eigenvalue 3. Plugging in `lambda_2 = 2`, the eigenspace is the kernel of `A - 2I = [[1, 1], [0, 0]]`, the line `x + y = 0`, so `v_2 = (1, -1)` is an eigenvector for eigenvalue 2.

## Common Misconceptions

- Diagonal entries are not always the eigenvalues. They match only for triangular or diagonal matrices.
- Complex conjugate eigenvalues do not mean the matrix is wrong or non-physical. They encode a rotation-plus-scaling action with no real invariant direction.
- The zero vector is not an eigenvector, even though `A times 0 = lambda times 0` is true for every `lambda`; eigenvectors must be non-zero by definition.
- Eigenvalues and eigenvectors are not independent; each real eigenvalue brings its own eigenspace, found by solving `(A - lambda I) v = 0`.

## Transfer

Eigenpairs drive diagonalisation (`A = P D P^-1`), modal decoupling of dynamical systems, principal-component analysis, vibration mode shapes, and Markov chain steady states. Every one of these reduces to the same two-step procedure: find the eigenvalues from `lambda^2 - T lambda + D = 0`, then find each eigenspace from `(A - lambda I) v = 0`.
