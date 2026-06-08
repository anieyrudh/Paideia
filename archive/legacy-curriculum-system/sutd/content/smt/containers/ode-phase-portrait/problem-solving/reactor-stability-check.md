# Transfer Problem: Reactor Stability Check

## Prompt

A simplified reactor model linearises near an operating point to:

```text
x' = y
y' = -0.8x + 0.4y
```

Classify the operating point, predict whether a small perturbation settles or
grows, and name one parameter change that would reverse the stability.

## Rubric

- Identifies `A = [[0, 1], [-0.8, 0.4]]`.
- Shows `T = 0 + 0.4 = 0.4`.
- Shows `D = (0)(0.4) - (1)(-0.8) = 0.8`.
- Shows `Delta = T^2 - 4D = 0.4^2 - 4(0.8) = -3.04`.
- Concludes that `D > 0`, `Delta < 0`, and `T > 0`, so the operating point is an unstable spiral.
- Explains that the perturbation grows while rotating in state space.
- Names a stabilising change, such as making the trace negative by adding damping or feedback that reduces the positive `y` coefficient.
