# Control-Loop Stability Check

## Prompt

A control loop linearises near an operating point to:

`A = [[0, 1], [-0.8, 0.4]]`

Classify the operating point, predict whether a small perturbation settles or
grows, and name one coefficient change that would reverse the stability.

## Worked Solution

Trace:

`T = a + d = 0 + 0.4 = 0.4 per time unit`

Determinant:

`D = ad - bc = (0)(0.4) - (1)(-0.8) = 0.8 per time unit squared`

Discriminant:

`Delta = T^2 - 4D = 0.4^2 - 4(0.8) = -3.04 per time unit squared`

Because `D > 0` and `Delta < 0`, the eigenvalues are a complex pair. Their
real part is `T / 2 = 0.2 per time unit`, which is positive. The operating point
is an unstable spiral, so a small perturbation grows while rotating.

One stabilising change is to make the trace negative, for example by reducing
the `d` coefficient below `0` while keeping the determinant positive.

## Rubric

- Computes trace, determinant, and discriminant correctly.
- Uses the real part of the complex pair, not the imaginary part alone.
- States "unstable spiral" or equivalent growing rotation.
- Gives a coefficient change that makes the real part negative.
