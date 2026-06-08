# Linear Regression Workflow

1. Plot the paired observations and check that a straight-line summary is
   plausible over the observed range.
2. Compute `x_bar` and `y_bar`.
3. Compute the least-squares slope:
   `m = sum((x_i - x_bar)(y_i - y_bar)) / sum((x_i - x_bar)^2)`.
4. Compute the intercept: `b = y_bar - m x_bar`.
5. Use `y_hat = mx + b` for predictions inside the observed x range.
6. Inspect residuals and R squared before interpreting the model.
7. State the claim as association or prediction unless the study design supports
   causation.
