---
subject: "10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra"
concept: optimisation-with-lagrange-multipliers
branch: sutd
level: Undergraduate
syllabus_ref: SUTD 10.018 Modelling Space and Systems / constrained optimisation and Lagrange multipliers
prerequisites:
  - partial-derivatives-and-gradient
  - level-sets
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Optimisation with Lagrange Multipliers

## First-Principles Explanation

For an unconstrained optimum, the gradient of the objective is zero. With a
constraint \(g(x,y)=c\), feasible moves must stay tangent to the constraint
curve. At a constrained optimum, no tangent move can improve the objective to
first order. That happens when the objective gradient is normal to the
constraint, so it must be parallel to the constraint gradient:

```latex
\nabla f(x,y)=\lambda\nabla g(x,y)
```

The scalar \(\lambda\) is the multiplier. It is not the objective value. It
measures how much the optimum would change if the constraint level were relaxed
slightly.

## Why It Matters

SUTD design and modelling tasks often trade performance against a resource:
material, energy, time, cost, or capacity. Lagrange multipliers turn the tradeoff
into a local gradient-alignment test and a sensitivity estimate.

## Canonical Example

Maximise \(f(x,y)=4x+3y-\frac12(x^2+y^2)\) subject to
\(g(x,y)=x^2/9+y^2/4=1\). A feasible point is a candidate optimum only if the
objective gradient is parallel to \(\nabla g=\langle 2x/9,2y/4\rangle\). If the
objective still has a component along the tangent, sliding along the constraint
can improve the design.

## Common Misconceptions

- \(\lambda\) is a sensitivity, not the optimum value.
- Objective and constraint gradients are parallel at the optimum, not
  perpendicular.
- The constraint gradient is normal to the feasible curve; the tangent direction
  is where feasible first-order moves live.
