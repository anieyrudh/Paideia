# Transfer Problem: Production-Mix Corner Check

A small workshop makes two products. Product `x` uses 1 assembly hour and 2
labour hours per batch. Product `y` uses 1 assembly hour and 1 labour hour per
batch. The workshop has at most 12 assembly hours and 16 labour hours. Profit
is:

```latex
Z = 4x + 3y.
```

## Task

1. Write the constraints.
2. Find the feasible corner points.
3. Substitute each feasible corner into the objective.
4. Identify the optimum and explain which constraints bind there.

## Rubric

| Criterion | Strong evidence |
| --- | --- |
| Inequality translation | Uses `x + y <= 12`, `2x + y <= 16`, `x >= 0`, and `y >= 0` with units. |
| Feasibility check | Rejects any candidate that fails a constraint and keeps only feasible corners. |
| Objective substitution | Shows `Z = 4x + 3y` with substituted values and profit-units. |
| Interpretation | Names the optimum and explains the binding resource limits. |
