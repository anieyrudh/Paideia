# core/a11y · Technical Record

## Public Interface

`@paideia/a11y` exports accessibility impact types, axe-style violation shapes,
impact counting, budget assertion, accessible-name validation, and DOM id-token
validation.

The package is pure TypeScript. It does not import browser automation, axe, DOM
globals, or branch app code.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Violation ids are non-empty trimmed strings | `validateViolations()` |
| Impact ordering is stable | `impactRank()` and property test |
| Missing impact is treated as `minor` | `normalizeImpact()` and summary test |
| Budgets are finite non-negative integers | `validateBudget()` |
| Default blocking threshold is serious or critical | `summarizeA11yViolations()` default parameter |
| Accessible names contain visible text after whitespace collapse | `accessibleName()` |
| DOM id tokens are non-empty and whitespace-free | `domIdToken()` |
| Inputs are not mutated | non-mutation regression test |

## Local Review Fixes

- P1: `violationsAtOrAbove()` previously trusted typed inputs and could filter
  out malformed runtime impact values. Resolution: it now validates and returns
  `KernelResult.err("out-of-domain", ...)` for malformed impacts.
- P1: `assertA11yBudget()` previously returned a minor-threshold summary, which
  made unbudgeted missing-impact violations look blocking. Resolution: budget
  summaries now mark only explicitly budgeted impacts that exceed their allowed
  counts as blocking.

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime axe, Playwright, jsdom, or browser dependency is bundled.

## P2 Followups

- Add `core/a11y` to `docs/core-modules.md` as implemented during the next docs
  catalogue refresh.
- Migrate repeated axe filtering in container tests to consume this package in a
  separate mechanical test cleanup PR.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: a core accessibility package could accidentally depend on Playwright,
  axe, or browser globals. Resolution: this package accepts plain axe-style
  violation objects and stays pure.

### P1 issues

- Risk: tests could overstate "accessibility passed" while only checking
  critical issues. Resolution: budgets are explicit and summaries preserve the
  actual threshold and counts.

### High-bandwidth questions surfaced

- A later harness cleanup should decide whether all container tests require
  `critical: 0` or `critical: 0, serious: 0` as the default merge budget.

## Iteration log

- Read existing shell and container axe tests to identify duplicated severity
  filtering.
- Kept this kernel independent of `@axe-core/playwright` so production runtime
  license and bundle boundaries stay simple.
- Added property and edge-case tests for severity ordering, budgets, malformed
  violations, and validation helpers.
