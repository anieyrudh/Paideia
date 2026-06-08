---
subject: math
concept: linear-programming-feasible-region
branch: shared
level: Shared core
syllabus_ref: Shared mathematics / Optimisation / Linear programming feasible regions
prerequisites:
  - linear-equations
  - inequalities
  - cartesian-plotting
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# LP Feasible Region Visualiser

## First-Principles Explanation

A two-variable linear programme turns limits into inequalities. Each inequality
keeps one side of a boundary line. The feasible region is the overlap of all
those allowed half-planes, including non-negativity limits such as `x >= 0` and
`y >= 0` when the quantities are production amounts.

The standard graphical problem has this shape:

```latex
\text{maximise } Z = c_x x + c_y y
\quad\text{subject to}\quad
a_i x + b_i y \leq d_i,\; x \geq 0,\; y \geq 0.
```

The feasible region is not chosen by eye. For any candidate point, substitute
the values of `x` and `y` into every inequality. The point is feasible only when
every inequality is true at the same time.

```latex
x + y \leq 10,\quad 2x + y \leq 14,\quad x + 3y \leq 12
```

At `(x,y) = (4,2)`, the substitutions are:

```latex
4 + 2 = 6 \leq 10,\quad
2(4) + 2 = 10 \leq 14,\quad
4 + 3(2) = 10 \leq 12.
```

So `(4,2)` is feasible. It is not automatically optimal.

The objective value is a separate calculation:

```latex
Z = 3x + 2y = 3(4) + 2(2) = 16.
```

For a bounded polygon and a linear objective, the best value occurs at a
corner or along an edge containing corners. The reason is geometric: all points
with the same objective value lie on parallel lines, and sweeping those lines
across the polygon makes the last contact at the boundary.

## Common Misconceptions

- The centre of the shaded polygon is not special unless the objective makes it
  special. Linear objectives prefer directions, not visual balance.
- A point that satisfies one inequality can still fail another one.
- Infeasible does not mean the equations cannot be written. It means there is
  no point satisfying the declared constraints together, or the tested point
  is outside their overlap.
- Larger `x` is not always better, even when the coefficient of `x` is
  positive, because increasing `x` can consume resources that would have made
  more valuable `y` possible.

## Why This Matters

Linear programming is the first optimization model many learners meet where
constraints are as important as the objective. The graphical method builds the
core habit: define the feasible set first, then optimize only inside it. That
habit transfers to operations research, resource allocation, scheduling, and
design trade-off problems.
