# Transfer Problem: Resource Allocation Table

You are choosing among projects with a fixed credit budget. Each project has a credit cost and a benefit score. Define a dynamic programming state that records the best benefit from the first `k` projects with `b` credits left.

## State

`best(k, b)` is the maximum benefit available after considering projects `1..k` with `b` credits remaining.

- `k` is measured in projects considered.
- `b` is measured in credits remaining.
- `best(k, b)` is measured in benefit points.

## Recurrence

For project `k` with cost `cost(k)` and benefit `benefit(k)`:

```text
best(k, b) = max(
  best(k - 1, b),
  benefit(k) + best(k - 1, b - cost(k))
)
```

The second option is allowed only when `b >= cost(k)`.

## Memoisation Check

If `best(4, 6)` appears in two branches, the table should reuse the stored value. Reuse does not change the recurrence result; it avoids solving the same state again.

## Rubric

- Full credit: defines `best(k, b)`, states units, gives base cases, applies the recurrence, and identifies reused table entries.
- Partial credit: writes a plausible recurrence but leaves the state or units ambiguous.
- Retry: describes only a loop over projects without explaining what a table cell means.
