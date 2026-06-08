# Problem-Solving Algorithm

Use this checklist whenever a problem looks recursive but may need dynamic programming.

1. Define the state in one sentence: `value(state)` means the answer to which smaller problem?
2. State the units for the value. In the simulation, `ways(i)` is measured in sequences.
3. Write base cases before the recurrence.
4. Write the recurrence only in terms of smaller states.
5. Fill or memoise each state once, then reuse stored values when the same state appears again.
6. Interpret the final state in the original context.

## Worked Pattern

For the stair example:

```text
ways(0) = 1
ways(1) = 1
ways(i) = ways(i - 1) + ways(i - 2)
```

The table does not change the recurrence. It records `ways(0), ways(1), ...` so a repeated request for `ways(4)` reuses the stored value.

## Transfer Rubric

- Full credit: state definition, base cases, recurrence, table interpretation, and a clear statement that memoisation changes work done rather than the recurrence value.
- Partial credit: recurrence and final value are correct but the state meaning or units are missing.
- Retry: describes only a loop or code order without naming the state value.
