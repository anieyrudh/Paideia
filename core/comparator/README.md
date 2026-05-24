# @paideia/comparator

Pure comparison helpers for side-by-side reasoning.

This package validates criteria and options, normalizes criterion values,
computes weighted scores, ranks options deterministically, reports pairwise
deltas, and extracts a Pareto front. It does not render UI or choose which
criteria matter for a subject.

## Example

```ts
import { rankOptions } from "@paideia/comparator";

const result = rankOptions({
  criteria: [
    {
      id: "accuracy",
      label: "Accuracy",
      direction: "higher-is-better",
      weight: 2,
      scale: { min: 0, max: 100 },
    },
    {
      id: "cost",
      label: "Cost",
      direction: "lower-is-better",
      weight: 1,
      scale: { min: 0, max: 100 },
    },
  ],
  options: [
    { id: "a", label: "A", values: { accuracy: 80, cost: 20 } },
    { id: "b", label: "B", values: { accuracy: 70, cost: 10 } },
  ],
});

if (result.ok) {
  // Each ranked option includes the final score and normalized criterion values.
  console.log(result.value);
}
```

## Conventions

- Higher final score ranks earlier.
- Missing weights default to `1`; explicit weights must be finite and
  non-negative.
- Explicit scales are preferred because they make normalization visible.
- Ties keep the same rank and are ordered by option id.
- Missing values are rejected; they are never treated as zero.
