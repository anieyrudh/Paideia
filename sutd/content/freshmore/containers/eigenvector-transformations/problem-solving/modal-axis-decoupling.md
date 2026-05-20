# Modal Axis Decoupling

For `A = [[4, 0], [0, 1.5]]` and `v = (0, 2)`:

```latex
A\mathbf{v}
=
\begin{bmatrix}4 & 0\\0 & 1.5\end{bmatrix}
\begin{bmatrix}0\\2\end{bmatrix}
=
\begin{bmatrix}0\\3\end{bmatrix}
=
1.5\begin{bmatrix}0\\2\end{bmatrix}
```

The vector is an eigenvector because the output stays on the same axis. The eigenvalue is `1.5`, so the modal coordinate is scaled by `1.5 times` without coupling into the other coordinate.
