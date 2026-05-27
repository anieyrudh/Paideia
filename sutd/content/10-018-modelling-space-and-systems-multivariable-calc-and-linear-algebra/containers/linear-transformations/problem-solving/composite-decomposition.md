# Composite Decomposition

The composite "scale by 2 then rotate by 30 degrees" applies the scale `S = [[2, 0], [0, 2]]` first, then the rotation `R(30 deg)`. Matrix product order is right-to-left, so the composite matrix is `A = R S`:

```latex
S = \begin{bmatrix} 2 & 0\\ 0 & 2\end{bmatrix},
\quad
R = \begin{bmatrix} \cos 30^\circ & -\sin 30^\circ\\ \sin 30^\circ & \cos 30^\circ\end{bmatrix}
\approx
\begin{bmatrix} 0.866 & -0.500\\ 0.500 & 0.866\end{bmatrix}
```

```latex
A = R S
\approx
\begin{bmatrix} 1.732 & -1.000\\ 1.000 & 1.732\end{bmatrix}
```

Read off the diagnostics:

- `det A = det R times det S = 1 times 4 = 4`. Area is scaled by 4 (consistent with isotropic scaling by 2 in both axes). Orientation is preserved (positive determinant).
- `tr A approx 1.732 + 1.732 = 3.464 = 4 cos 30 deg`. The composite trace is `2 trace(R)` because the scale is isotropic.
- `T(e_1) = (1.732, 1.000)`. The image is no longer a unit vector — scaling has stretched it. The angle is `arctan(1 / 1.732) = 30 degrees`.
- `T(e_2) = (-1.000, 1.732)`. Same magnitude, rotated 90 degrees from `T(e_1)`. Perpendicular images at the same length confirm "scale then rotate".

The decomposition shows that even when `A` looks unfamiliar, reading the basis images cleanly separates the scaling component (lengths) from the rotation component (angles). Reversing the order — rotate first then scale — would produce the same matrix because the scale is isotropic; for anisotropic scaling the order matters and the basis images would differ.
