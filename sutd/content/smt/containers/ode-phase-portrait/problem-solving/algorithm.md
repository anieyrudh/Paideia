# ODE Phase Portrait Algorithm

Use this procedure for a two-variable linear system near an equilibrium.

1. Write the system as `z' = A z`, where `z = (x, y)` and `A = [[a, b], [c, d]]`.
2. Locate the equilibrium. For the simulation family, the equilibrium is the origin because `x' = 0` and `y' = 0` when `x = 0` and `y = 0`.
3. Compute the trace: `T = a + d`.
4. Compute the determinant: `D = ad - bc`.
5. Compute the discriminant: `Delta = T^2 - 4D`.
6. Classify:
   - `D < 0`: saddle.
   - `D > 0`, `Delta > 0`, `T < 0`: stable node.
   - `D > 0`, `Delta > 0`, `T > 0`: unstable node.
   - `D > 0`, `Delta < 0`, `T < 0`: stable spiral.
   - `D > 0`, `Delta < 0`, `T > 0`: unstable spiral.
   - `D > 0`, `Delta < 0`, `T = 0`: centre.
7. Interpret the result in words: decide whether a small perturbation returns, escapes, circles, or splits by direction.
8. Transfer the reasoning to the original context by naming what `x`, `y`, and the stability decision mean there.
