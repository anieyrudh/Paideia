# Problem-Solving Algorithm

Use this algorithm for two-variable graphical linear programming problems.

## 1. Define the variables

State what `x` and `y` measure and include units. For a production model, both
may be measured in batches.

## 2. Translate each condition into an inequality

Resource limits become half-plane constraints.

```latex
x + y \leq 10,\quad 2x + y \leq 14,\quad x + 3y \leq 12,\quad x \geq 0,\quad y \geq 0.
```

Legend:

| Colour | Symbol | Meaning | Unit |
| --- | --- | --- | --- |
| Blue | `x + y` | assembly capacity expression | batch-hours |
| Purple | `2x + y` | labour capacity expression | labour-hours |
| Green | `x + 3y` | material capacity expression | material-units |
| Amber | `Z` | objective value | profit-units |

## 3. Find the feasible region

Plot each boundary line by replacing the inequality sign with equality. Keep the
side that satisfies the original inequality. The feasible region is the overlap
of all kept sides.

## 4. List feasible corners

Find intersections of boundary lines and axes, then keep only the points that
satisfy every inequality.

## 5. Evaluate the objective at corners

```latex
Z = c_x x + c_y y.
```

Substitution example:

```latex
Z = (3\ \text{profit-units/batch})(6\ \text{batches})
  + (2\ \text{profit-units/batch})(2\ \text{batches})
  = 22\ \text{profit-units}.
```

The result means that producing 6 batches of `x` and 2 batches of `y` gives 22
profit-units for the declared objective, provided the point satisfies every
constraint.

## 6. Interpret binding constraints

A binding constraint is exactly equal at the optimum. Binding constraints
explain which resources are fully used and which still have slack.
