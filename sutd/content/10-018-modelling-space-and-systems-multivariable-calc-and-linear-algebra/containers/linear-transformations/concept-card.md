---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: linear-transformations
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

# Linear Transformations

A linear transformation `T` of the plane is a function from R^2 to R^2 that preserves vector addition and scalar multiplication. Every linear transformation of the plane is represented by a unique 2x2 matrix `A` whose columns are the images of the standard basis: `A e_1` is the first column and `A e_2` is the second column. Knowing what `T` does to `e_1` and `e_2` is enough to know what it does to every other vector.

```latex
A = \big[\, T(\mathbf{e}_1) \mid T(\mathbf{e}_2)\,\big]
=
\begin{bmatrix} a & b\\ c & d\end{bmatrix}
```

## First-Principles Explanation

Because of linearity, any vector `v = x e_1 + y e_2` is sent to `T(v) = x T(e_1) + y T(e_2)`. The transformation is therefore completely determined by where the basis lands. The four matrix entries are the coordinates of those two basis images:

```latex
T(\mathbf{e}_1) = (a, c)
\qquad
T(\mathbf{e}_2) = (b, d)
```

Every 2D linear transformation can be classified by reading the basis images:

- **Scaling** stretches each axis by a (possibly different) factor; `A = diag(s_x, s_y)`.
- **Rotation** by angle `theta` sends `e_1` to `(cos theta, sin theta)` and `e_2` to `(-sin theta, cos theta)`.
- **Reflection** across the line through the origin at angle `phi` sends each basis vector to its mirror image about that line.
- **Shear** keeps one axis fixed and tilts the other; one column is a basis vector, the other gains an off-diagonal component.
- **Composites** are products of the above.

## Canonical Example

For `A = [[0, -1], [1, 0]]`, `T(e_1) = (0, 1)` and `T(e_2) = (-1, 0)`. The basis has been rotated 90 degrees counter-clockwise. The determinant `0 - (-1)(1) = 1` confirms area is preserved and orientation is unchanged, consistent with a pure rotation.

## Common Misconceptions

- Linear is not the same as rigid: only rotations and reflections preserve lengths and angles; scalings and shears do not.
- A rotation matrix is not identified by diagonal entries alone; the off-diagonal `(sin theta, -sin theta)` pair encodes the angle.
- Linear means the origin is fixed: there is no translation. Translations are affine, not linear.

## Transfer

Linear transformation classification underlies computer graphics pipelines, body-of-revolution physics, modal-shape interpretation in vibration, and PCA. Each downstream application asks the same diagnostic: read the basis images, identify whether the transformation is one of the canonical types or a composite, and compose / invert accordingly.
