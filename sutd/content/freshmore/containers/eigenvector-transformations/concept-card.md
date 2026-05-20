---
subject: freshmore
concept: eigenvector-transformations
branch: sutd
level: Freshmore
syllabus_ref: SUTD Freshmore Mathematics / Linear Algebra
prerequisites:
  - vector-transformations
  - matrices
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Eigenvector Transformations

An eigenvector is a non-zero vector whose direction is preserved by a linear transformation. If a matrix `A` sends `v` to a scalar multiple of itself, then

```latex
A\mathbf{v} = \lambda\mathbf{v}
```

The vector `v` is the eigenvector and the number `lambda` is the eigenvalue. The eigenvalue tells the scale factor along that direction: positive values stretch without flipping, negative values flip through the origin, and values between 0 and 1 shrink.

## First-Principles Explanation

A 2x2 matrix moves every input vector by combining the moved basis vectors. Most directions tilt to a new line. An eigenvector is special because the combination lands back on the original line. That is why eigenvectors are useful in Freshmore modelling: they identify axes where a coupled transformation becomes a simple one-dimensional scale.

For a candidate vector, compute `Av` and compare it with `v`. If both components share the same scale factor, the vector is an eigenvector. If one component suggests one scale and the other suggests a different scale, the direction changed and the vector is not an eigenvector.

## Canonical Example

For `A = [[3, 1], [0, 2]]` and `v = (1, 0)`:

```latex
A\mathbf{v}
=
\begin{bmatrix}3 & 1\\0 & 2\end{bmatrix}
\begin{bmatrix}1\\0\end{bmatrix}
=
\begin{bmatrix}3\\0\end{bmatrix}
=
3\begin{bmatrix}1\\0\end{bmatrix}
```

The direction stays on the x-axis, so `(1, 0)` is an eigenvector with eigenvalue `3`.

## Common Misconceptions

- Every transformed vector is not an eigenvector; the transformed vector must remain parallel to the original vector.
- An eigenvalue is not a rotation angle; it is the scale factor along a preserved direction.
- The zero vector is excluded because it trivially maps to a scalar multiple and does not define a direction.

## Transfer

Eigenvectors are the entry point to diagonalisation, principal components, modal analysis, and stability reasoning. In each setting, the same check applies: find directions where the transformation acts like a simple scale.
