# core/comparator · Technical Record

## Public Interface

`@paideia/comparator` exports comparison criteria, options, matrices, weighted
scores, ranked options, pairwise deltas, normalization, scoring, ranking,
pairwise comparison, Pareto-front extraction, and matrix validation.

The package is pure TypeScript and has no renderer, DOM, charting, telemetry, or
branch dependency.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Criterion and option ids are non-empty trimmed strings | `validateCriterion()` and `validateComparisonMatrix()` |
| Criterion ids are unique | `validateComparisonMatrix()` |
| Option ids are unique | `validateComparisonMatrix()` |
| Weights are finite and non-negative | `validateCriterion()` |
| At least one positive effective weight exists | `scoreOption()` |
| Scales are finite and satisfy `min < max` | `validateCriterion()` |
| Every option has a finite value for every criterion | `validateComparisonMatrix()` |
| Normalized scores stay in `[0, 1]` | `normalizeCriterionValue()` and property test |
| Ranking is deterministic | `rankOptions()` and ranking test |
| Inputs are not mutated | non-mutation regression test |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime comparison, statistics, charting, or UI package is bundled.

## P2 Followups

- Add `core/comparator` to `docs/core-modules.md` as implemented during the next
  docs catalogue refresh.
- If a future container needs uncertain criterion values, route uncertainty
  through `core/uncertainty-propagation` instead of extending this score shape
  implicitly.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: comparison scoring can hide subjective weighting choices. Resolution:
  every score carries normalized criterion values, weights are explicit, and
  all-zero weights return `KernelResult.err(...)`.

### P1 issues

- Risk: treating missing values as zero would create false rankings.
  Resolution: every option must provide a finite value for every criterion.

### High-bandwidth questions surfaced

- Future learning surfaces should decide whether to display a single ranked
  score or emphasize Pareto tradeoffs first.

## Iteration log

- Kept this package independent of charting and UI.
- Added property tests for normalization bounds.
- Added deterministic tie-breaking and non-mutation tests.
