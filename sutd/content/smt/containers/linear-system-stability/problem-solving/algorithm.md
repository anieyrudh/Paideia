# Linear System Stability Algorithm

1. Write the local linear system in matrix form: `z' = A z`, with
   `A = [[a, b], [c, d]]`.
2. Compute the trace: `T = a + d`.
3. Compute the determinant: `D = ad - bc`.
4. Compute the discriminant: `Delta = T^2 - 4D`.
5. Classify the eigenvalue case:
   - `D < 0`: saddle, therefore unstable.
   - `D > 0` and `Delta > 0`: real eigenvalues; use their signs.
   - `D > 0` and `Delta < 0`: complex pair; use the real part `T / 2`.
   - boundary values: degenerate case; the linear test needs more care.
6. Interpret the motion:
   - all real parts negative: nearby perturbations settle.
   - any real part positive: some nearby perturbation grows.
   - real part zero: the linear model alone does not show asymptotic settling.
7. Check the plotted trajectory against the formula result rather than using it
   as the first source of truth.
