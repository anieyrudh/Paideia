---
subject: cs
concept: gradient-descent-landscape
branch: shared
level: Shared core
syllabus_ref: Shared computing and mathematics / Optimisation / Gradient descent
prerequisites:
  - derivatives
  - functions
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Gradient Descent Landscape

## First-Principles Explanation

Gradient descent is an iterative rule for lowering a loss function. At a parameter point, the gradient points in the direction where loss increases fastest, so moving in the opposite direction is the most direct local attempt to reduce loss.

For a two-parameter model, write the parameters as theta = (x, y) and the loss as L(x, y). One step is:

```latex
\theta_{k+1} = \theta_k - \eta \nabla L(\theta_k)
```

The symbol eta is the learning rate. It is not a quality score; it is a scale factor that turns the local gradient into a step length. If eta is too small, descent can be slow. If eta is too large, the next point can jump across a valley, oscillate, or leave the useful domain.

## Why It Matters

Gradient descent is the basic training move behind many machine-learning models and a common numerical method in engineering optimisation. The concept is reusable because the same update rule appears in regression fitting, neural-network training, and parameter tuning.

## Canonical Example

For a bowl-shaped loss surface L(x, y) = (x - 1)^2 + 0.8(y + 1)^2 + 0.2, the gradient near (3, 2) points up and right, so the descent step moves down and left toward (1, -1). Repeating the update creates a trace of points that should lower loss until the gradient is nearly flat.

## Common Misconceptions

- A larger learning rate is not always faster. It can overshoot across a steep ravine and produce a worse or unstable trace.
- The local gradient is not a map of the whole landscape. It says what happens infinitesimally nearby, not where every global minimum is.
- A flat-looking step is not always a solved model. Saddles and plateaus can have small gradients without being useful minima.

## PMOE-T Arc

Predict whether a larger learning rate helps or hurts in a narrow ravine. Manipulate the landscape, starting point, learning rate, and step count. Observe the kernel trace on the loss surface. Explain the update using the formula, substitution, units, and interpretation. Transfer the same rule to a learning-rate tuning case.
