# Diagonalisation Readiness

For the coupled spring stiffness matrix `A = [[5, -2], [-2, 2]]`:

```latex
T = 5 + 2 = 7
\qquad
D = 5 \cdot 2 - (-2)(-2) = 6
\qquad
T^2 - 4D = 49 - 24 = 25 > 0
```

Two distinct real eigenvalues exist. Solve `lambda^2 - 7 lambda + 6 = 0`:

```latex
\lambda = \tfrac{7 \pm 5}{2}
\Rightarrow
\lambda_1 = 6, \quad \lambda_2 = 1
```

For `lambda_1 = 6`, solve `(A - 6I) v = [[-1, -2], [-2, -4]] v = 0`. A non-zero solution is `v_1 = (-2, 1)`. For `lambda_2 = 1`, solve `(A - I) v = [[4, -2], [-2, 1]] v = 0`. A non-zero solution is `v_2 = (1, 2)`.

Verify: `A v_1 = (-12, 6) = 6 v_1`. `A v_2 = (1, 2) = 1 v_2`. Both check.

Because `A` is symmetric and has two distinct real eigenvalues, the eigenvectors are orthogonal: `v_1 dot v_2 = -2 + 2 = 0`. The system can be diagonalised in real orthogonal coordinates, so the coupled spring problem decouples into two independent one-dimensional oscillators along the eigen-axes.
