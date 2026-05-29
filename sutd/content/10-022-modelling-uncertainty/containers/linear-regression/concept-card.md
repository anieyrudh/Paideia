---
subject: 10-022-modelling-uncertainty
concept: linear-regression
branch: sutd
level: "SUTD 10.022"
syllabus_ref: "Linear Regression"
prerequisites:
  - descriptive-statistics
  - scatter-plots
  - covariance-and-correlation
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Linear Regression

## First-principles explanation

Linear regression fits a straight-line model `y_hat = mx + b` to paired data.
The least-squares fit chooses `m` and `b` to minimise the sum of squared
vertical residuals, not to pass through every point.

## Key definitions

- **Slope**: the fitted change in `y` for one unit of `x`.
- **Intercept**: the fitted value of `y` when `x = 0`.
- **Residual**: observed `y` minus fitted `y_hat`.
- **R squared**: the fraction of observed `y` variation explained by the fitted
  line in this dataset.

## Learner contract

- Predict how a high-leverage observation changes a fitted line.
- Manipulate dataset, outlier shift, and noise level before reveal.
- Observe the scatter plot, fitted line, residual table, slope, intercept, and
  R squared only after committing a prediction.
- Explain why a strong fit is an association claim over the observed range, not
  automatic causal evidence.

## Core idea

The slope is the average fitted change in `y` for a one-unit increase in `x`.
The intercept anchors the line, while residuals show what the line misses. A
high R squared says the line explains much of the variation in this data cloud;
it does not prove causation or license far-range extrapolation.

## What the student does

The learner predicts the direction of the fitted slope before reveal, then
chooses a dataset and manipulates an outlier and background noise. The reveal
shows the scatter plot, least-squares line, residual table, formula panel,
substituted values, units, and interpretation.

## Misconceptions this surfaces

- **The regression line must pass through all observations**: residuals remain
  visible after reveal.
- **A high R squared proves causation**: the interpretation panel distinguishes
  association from causal evidence.
- **The intercept is always meaningful**: the transfer prompt asks whether
  predictions are inside the observed range.
