# core/model-evaluation · Technical Record

## Public Interface

`@paideia/model-evaluation` exports branded label and score constructors,
multi-class confusion matrix reports, per-label precision/recall/F1 summaries,
aggregate model metrics, calibration buckets, and a small aggregate-metric
comparator.

The module deliberately complements `@paideia/probability-stats`; binary
threshold-count and cost-curve evidence stays in that package.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Label names are non-empty trimmed strings | `labelName()` runtime guard; matrix validation rechecks label strings |
| Probability scores are finite and in `[0, 1]` | `probabilityScore()` runtime guard; calibration validation rechecks scores |
| Confusion matrices require at least one example | `confusionMatrix()` precondition guard |
| Explicit label lists are non-empty, unique, and cover all examples | `validateLabelSet()` and per-example coverage guard |
| Counts and aggregate metrics are finite | deterministic integer counts plus safe division; property tests assert ranges |
| Zero-denominator precision/recall/F1 returns `0` | `safeRatio()` and targeted tests |
| Calibration reports require scored examples and 1-50 integer buckets | `calibrationReport()` precondition and domain guards |
| Inputs are not mutated | implementation copies label order and tests compare caller-owned arrays before/after |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing core kernel
  packages.

No third-party runtime evaluation library is bundled.

## P2 Followups

- Add `core/model-evaluation` to `docs/core-modules.md` when the docs catalogue
  is next refreshed.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Potential overlap with `core/probability-stats` binary threshold evidence.
  Resolution: scoped this kernel to multi-class confusion matrices, aggregate
  model metrics, and calibration buckets; binary threshold/cost curves remain in
  `core/probability-stats`.

### P1 issues

- Denominator choices can become invisible in learner-facing sims. Resolution:
  public reports expose counts, support, bucket counts, and unit-interval metric
  values so containers can show substitutions and legends.

### High-bandwidth questions surfaced

- Future fairness or stakeholder-cost policy should remain outside this kernel
  unless an ADR defines shared semantics across curricula.

## Iteration log

- Read `core/probability-stats` first to avoid duplicating binary
  threshold-classification ownership.
- Implemented a hand-rolled pure TypeScript kernel with no runtime dependencies.
- Added property tests for metric bounds and confusion-matrix count conservation.
