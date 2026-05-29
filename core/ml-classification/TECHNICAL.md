# @paideia/ml-classification technical notes

## Public interface summary

The package exports a narrow binary-classification surface:

- `linearScore` computes `weights dot features + bias`.
- `sigmoidProbability` maps a finite score to a stable unit-interval sigmoid.
- `binaryLogisticLoss` computes stable binary logistic loss from a score and
  label.
- `confusionCountsFromScores` counts thresholded true positives, true
  negatives, false positives, and false negatives.
- `perceptronStep` performs one deterministic perceptron update for one
  labelled example.
- `linearSeparatorMargin` computes raw or label-adjusted geometric margin.

## Invariant enforcement table

| Invariant | Enforcement |
| --- | --- |
| Finite numeric inputs | Runtime guards return `precondition-violated`. |
| Non-empty equal-length vectors | Runtime guards return `precondition-violated`. |
| Labels are exactly `0` or `1` | `BinaryLabel` plus runtime `out-of-domain` checks. |
| Perceptron learning rate is positive | Runtime `out-of-domain` check. |
| Separator margin has non-zero normal vector | Runtime `out-of-domain` check. |
| Derived values remain finite | Runtime `numerical-instability` checks. |
| Caller arrays are not mutated | Copy-on-update implementation and immutability tests. |

## Dependency and license notes

Runtime dependencies are limited to `@paideia/shared` via the workspace. The
package adds no external runtime dependency and therefore adds no bundled
license surface. Tests use existing workspace dev tooling: Vitest and
fast-check.

## Test strategy

Tests cover happy paths, invalid input paths for every error code, edge cases
around threshold equality and zero margins, stable logistic loss, frozen result
records, input immutability, and property checks for sigmoid symmetry,
confusion-count conservation, and the perceptron signed-activation update.

## Anieyrudh Filter pass

The kernel is evidence-first: every helper exposes the exact score, label,
threshold, count, or margin arithmetic a learner-facing simulation would need
to show. It avoids hidden training loops, stochastic initialisation, framework
adapters, branch-specific shortcuts, and unexplained threshold selection, so
the Filter can reject overclaimed ML visuals while still permitting transparent
introductory binary-classification interactions.

## P2 follow-ups

- Add consumer-driven examples once the first ML container imports this kernel.
