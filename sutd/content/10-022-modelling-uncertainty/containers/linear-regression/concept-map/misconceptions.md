# Misconceptions

## The line must pass through all points

Least squares fits a summary line. It is expected to miss individual points
unless the data are perfectly linear.

## R squared proves causation

R squared measures fit strength in this dataset. It does not identify a causal
mechanism, remove confounding, or justify extrapolation.

## The intercept is always physically meaningful

The intercept is the model prediction at `x = 0`. It may be outside the observed
range or physically irrelevant even when the line is useful locally.
