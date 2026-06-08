# @paideia/fairness-metrics Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: group and score
brands, confusion-count and rate types, gap result types, group-audit helpers,
and threshold-sweep summaries.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Group names are non-empty trimmed strings | `groupName` returns `precondition-violated` |
| Scores and thresholds are finite values in `[0, 1]` | `probabilityScore` returns `out-of-domain` |
| Binary audit examples are non-empty | `validateGroups` returns `precondition-violated` |
| Binary audit labels and predictions are booleans | `assertBoolean` returns `precondition-violated` |
| Explicit groups are non-empty, unique, represented, and cover all examples | `validateGroups` returns `precondition-violated` or `out-of-domain` |
| Example ids are non-empty trimmed strings | `assertId` returns `precondition-violated` |
| Confusion counts are non-empty, non-negative integers, and internally consistent | `assertCounts` returns `precondition-violated` |
| Rate outputs are unit intervals, never percentages | Rates are computed by `rate`; zero denominators return `0` |
| Gap functions require at least two groups | `metricGap` returns `precondition-violated` |
| Threshold sweeps are non-empty, unique, and sorted ascending | `thresholdSweepSummary` validates and sorts |
| Results are immutable | Public arrays and records are frozen |

## Tests

The Vitest suite covers constructors, group confusion counts, rate metrics,
demographic parity, equal opportunity, equalized odds, audit reports, threshold
sweeps, invalid examples/groups/counts/scores, and a property test that group
counts conserve total examples.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime fairness, ML, or statistics dependency was added.

## P2 follow-ups

- Add subgroup aggregation only after a consuming container defines intersection
  semantics.
- Add confidence intervals for rates only after the statistics convention is
  agreed in a consuming container.
- Consider composing with `core/ml-classification` after both kernels land if a
  container needs score-to-count flow from model outputs.

## Anieyrudh Filter pass

- P0 issues checked: no model training, no hidden threshold optimisation, no
  policy recommendation, no branch-specific group presets, no public `any`, no
  hidden mutable state, and no rendering dependency.
- P1 issues checked: denominator counts remain exposed through
  `GroupConfusionCounts`, rates are unit intervals, zero-denominator rates
  return `0` instead of `NaN`, and threshold sweeps are deterministic.
- High-bandwidth questions surfaced: subgroup fairness, uncertainty intervals,
  policy thresholds, and harm weighting are intentionally outside this kernel.
- Outcome: the kernel provides reusable evidence for fairness-audit containers
  without pretending to decide whether a system is fair.
