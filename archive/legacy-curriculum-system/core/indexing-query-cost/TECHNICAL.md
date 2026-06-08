# core/indexing-query-cost technical notes

## Public interface

The package exports branded numeric types, table/index/predicate/plan types, and
pure functions for selectivity, table scan cost, B+tree height, index lookup
cost, plan comparison, and insert maintenance cost.

## Invariant enforcement

| Invariant | Enforcement |
|---|---|
| Positive counts are finite integers at least 1 | `positiveInteger()` guard |
| Fanout is at least 2 | `indexStats()` guard |
| Non-negative estimates never contain `NaN` or `Infinity` | `nonNegativeNumber()` guard |
| Selectivity is in `[0, 1]` | `selectivity()` guard |
| Selectivity assumptions are visible | `estimateSelectivity()` returns assumption strings |
| `distinctValues` does not exceed rows | `tableStats()` guard |
| Hash indexes only support equality predicates | `indexLookupCost()` guard |
| B+tree costs use kernel height calculation | `indexLookupCost()` calls `btreeHeight()` |
| Predicate estimates match supplied table stats | `predicateEstimate()` guard |
| Malformed plan assumptions do not throw | `planEstimate()` runtime guard |
| Cheapest-plan comparison is deterministic | `comparePlans()` preserves first tie |
| Caller-owned arrays are not mutated | Regression test |

## Dependencies and licenses

Runtime dependencies:

- `@paideia/shared` workspace dependency.

Dev-only dependencies follow existing core package patterns:

- `typescript`
- `vitest`
- `fast-check`

No third-party runtime package was added.

## Anieyrudh Filter pass

P0 issues + resolution:

- Potential DBMS optimizer scope creep: resolved by excluding SQL parsing,
  join-order planning, histograms, buffer pools, CPU time, and storage-engine
  behaviour from the contract and implementation.
- Potential silent bad numerics: resolved by routing all public numeric inputs
  and calculated costs through finite non-negative / bounded guards.

P1 issues + resolution:

- Clustered versus unclustered estimates can be visually misleading if hidden:
  addressed by returning explicit assumptions on every plan estimate.
- Selectivity defaults can be misleading if hidden: addressed by returning
  explicit assumptions on every predicate estimate.
- Hash range predicates could accidentally look valid in a generic index API:
  addressed with a direct guard and regression test.

High-bandwidth questions surfaced:

- Future database containers may need join-order and histogram models. Those
  should become separate ADR-backed kernels rather than widening this v0 index
  cost kernel.

## P2 cleanup backlog

- Add `core/indexing-query-cost` to `docs/core-modules.md` during the next
  broader core catalogue refresh.
