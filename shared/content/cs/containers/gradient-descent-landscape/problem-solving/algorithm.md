# Gradient Descent Problem-Solving Algorithm

1. Identify the current parameter point theta_k = (x_k, y_k) and the loss function L(x, y).
2. Evaluate or estimate the local gradient nabla L(theta_k) in loss units per parameter unit.
3. Choose the learning rate eta and check its units: parameter units per loss-gradient unit.
4. Substitute into theta_{k+1} = theta_k - eta nabla L(theta_k).
5. Interpret the next point: loss should decrease for a stable local step.
6. Repeat the update and inspect the trace reason: converged, max-steps, or out-of-domain.
7. Compare learning rates by the whole trace, not by the first step alone.

## Worked Transfer Anchor

For theta_0 = (-3.00, -2.40), eta = 0.22, and gradient nabla L(theta_0) = (-1.00, -19.20) on the ravine surface:

```latex
\theta_1 = (-3.00,\,-2.40) - 0.22(-1.00,\,-19.20)
         = (-2.78,\,1.82)
```

The y-coordinate jumps strongly because the y-gradient is steep. A stable answer must discuss both loss reduction and whether the trace remains inside the meaningful domain.

## Rubric

- States the update rule with symbols defined.
- Substitutes the current point, gradient, learning rate, and units.
- Interprets convergence or instability from the trace.
- Explicitly rejects "larger eta is always faster" when overshoot occurs.
