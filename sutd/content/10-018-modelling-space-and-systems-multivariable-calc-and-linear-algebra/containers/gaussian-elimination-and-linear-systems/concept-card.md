---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: gaussian-elimination-and-linear-systems
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.018 Modelling Space and Systems / Linear Algebra
prerequisites:
  - matrices
  - linear-equations
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Gaussian Elimination and Linear Systems

Gaussian elimination rewrites a linear system through row operations that preserve the solution set. For a 2 by 2 system, clearing the first column exposes whether the second row has a pivot, a contradiction, or a dependent equation.

The determinant tracks whether the coefficient rows are independent. Nonzero determinant gives one solution. Zero determinant requires checking the augmented row: it may be parallel and inconsistent, or dependent with infinitely many solutions.

## Misconceptions

- Row operations change the written equations but not their shared solution set.
- A zero determinant does not by itself distinguish no solution from infinitely many solutions.
