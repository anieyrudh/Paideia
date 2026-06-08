---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: line-integrals-and-conservative-vector-fields
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.018 Modelling Space and Systems / Multivariable Calculus
prerequisites:
  - vectors
  - gradients
  - parametric-curves
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Line Integrals and Conservative Vector Fields

Line integrals accumulate the component of a vector field along a path. The value is not just the path length: each small displacement contributes `F(r(t)) . r'(t) dt`, so direction and field alignment matter.

The special case is a conservative field. If `F = grad(phi)`, then the line integral from point A to point B is `phi(B) - phi(A)` for every path with the same endpoints. A potential function is therefore a certificate for path independence.

This container asks learners to predict whether changing a path shape changes the work. The simulation then compares a gradient field with a rotational field, making the endpoint shortcut visible only when it is justified.

## Misconceptions

- A longer path does not automatically mean a larger line integral; backwards or perpendicular field components can reduce the accumulated work.
- A vector field does not automatically have a potential function; circulation fields can make the work depend on the chosen route.

## Transfer

In robot motion, fluid circulation, and force-field energy estimates, the first modelling decision is whether endpoint potential change is legal or whether the full route must be integrated.
