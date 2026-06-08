# Stability Classifier from Trace and Determinant

For the 2D linear system `dx/dt = Ax` with `A = [[0, 1], [-2, -3]]`:

```latex
T = \operatorname{tr} A = 0 + (-3) = -3
\qquad
D = \det A = 0 \cdot (-3) - 1 \cdot (-2) = 2
\qquad
T^2 - 4D = 9 - 8 = 1 > 0
```

Because `D > 0` the eigenvalues share a sign. Because `T < 0` that shared sign is negative, so both eigenvalues are negative. The positive discriminant guarantees two distinct real eigenvalues. Reading the trace-determinant plane: this point sits in the stable-node region.

The origin is a **stable node**: every trajectory decays toward the origin along two real invariant directions, without rotation. No eigenvector calculation was required — the trace and determinant alone classified the qualitative behaviour.
