---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: determinant-and-trace
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.018 Modelling Space and Systems / Linear Algebra
prerequisites:
  - matrices
  - vector-transformations
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Determinant and Trace

The determinant of a 2x2 matrix is the signed area scale factor of the linear transformation it represents. The trace is the sum of the diagonal entries, which also equals the sum of the two eigenvalues. Together they summarise how a matrix scales area and how its eigenvalues balance, before any explicit eigenvector calculation.

```latex
\det\begin{bmatrix}a & b\\c & d\end{bmatrix} = ad - bc
\qquad
\operatorname{tr}\begin{bmatrix}a & b\\c & d\end{bmatrix} = a + d
```

## First-Principles Explanation

Every 2x2 matrix sends the unit square spanned by the basis vectors `e_1 = (1, 0)` and `e_2 = (0, 1)` to a parallelogram with sides `(a, c)` and `(b, d)`. The signed area of that parallelogram is exactly `ad - bc`. The sign tells whether the transformation preserves orientation (positive) or flips the plane (negative). When the determinant is zero, the parallelogram collapses to a line or a point; the transformation is no longer invertible.

The trace is the sum of the diagonal entries `a + d`. Because the characteristic polynomial of a 2x2 matrix is `lambda^2 - (a+d) lambda + (ad - bc)`, the trace equals `lambda_1 + lambda_2` and the determinant equals `lambda_1 lambda_2`. Two scalar summaries — trace and determinant — already pin down the eigenvalue pair without solving for eigenvectors.

## Canonical Example

For `A = [[3, 1], [0, 2]]`:

```latex
\det A = 3 \cdot 2 - 1 \cdot 0 = 6
\qquad
\operatorname{tr} A = 3 + 2 = 5
```

So the transformation scales every shape's area by `6` and its two eigenvalues add to `5`. Solving `lambda^2 - 5 lambda + 6 = 0` confirms `lambda_1 = 3` and `lambda_2 = 2`, matching the diagonal entries because `A` is upper-triangular.

## Common Misconceptions

- Determinant is not the unsigned area; the sign records orientation. A negative determinant means the matrix flips the plane like a mirror.
- Trace is not always equal to the determinant; the two are independent summaries except in degenerate cases.
- A zero determinant does not mean every output is zero; it means outputs collapse to a lower-dimensional subspace, but most input directions still move somewhere non-zero.
- Trace is not the diagonal product; it is the diagonal sum.

## Transfer

The trace-determinant pair classifies the qualitative behaviour of a 2x2 linear system. Eigenvalues live on the curve `lambda^2 - T lambda + D = 0` where `T` is the trace and `D` is the determinant. The discriminant `T^2 - 4D` decides whether the eigenvalues are real or complex. Stability analysis, modal decoupling, and 2D dynamical systems all read off `T` and `D` before ever computing eigenvectors.
