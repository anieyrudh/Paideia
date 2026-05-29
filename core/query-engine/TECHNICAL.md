# Query Engine · Technical Record

## Public interface summary

`@paideia/query-engine` exports a small deterministic query-plan layer:

- predicate evaluation with comparison, `and`, `or`, and `not`
- `selectRows(table, predicate)`
- `executeQuery({ source, steps })`
- query steps for selection, projection, inner/left equi-join, and group
  count/sum
- `QueryCostEvidence` describing left-to-right input rows, output rows,
  predicate comparisons, join comparisons, and projected columns

## Invariant enforcement

| Invariant | Enforcement |
|---|---|
| Tables and rows are valid relational data | Delegates to `core/relational-data.validateTable` and `validateRow` |
| Predicate columns exist | Runtime guard returns `precondition-violated` |
| Predicate values are scalar and finite | Runtime guard returns `out-of-domain` |
| Ordering comparisons use finite numbers | Runtime guard returns `out-of-domain` |
| Empty `and`/`or` predicates are invalid | Runtime guard returns `precondition-violated` |
| Query joins stay small and teachable | Public step supports only `inner` and `left` equi-joins |
| Group aggregates stay narrow | Public aggregate scope is `count` and `sum` |
| Caller-owned inputs are not mutated | Operators copy rows and property tests cover immutability-relevant behavior |

## Dependency and license notes

- Runtime dependencies: `@paideia/shared`, `@paideia/relational-data`.
- No external runtime dependencies added.
- Dev dependencies follow existing core package pattern: `typescript`,
  `vitest`, and `fast-check`.

## Test strategy

- Happy paths: comparison predicates, composed predicates, selection,
  multi-step query plans, join, group, and project.
- Edge cases: missing columns, invalid predicate values, invalid ordering
  operands, empty boolean predicates, unsupported join shape, missing aggregate
  column.
- Immutability: executing plans does not mutate caller-owned row objects.
- Property tests: selection preserves exactly matching rows; projection preserves
  cardinality.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- SQL parser creep: resolved by omitting SQL parsing entirely and accepting only
  typed query-plan steps.
- Database-engine creep: resolved by excluding indexes, storage pages,
  transactions, persistence, plan optimisation, and external data sources.
- Row-count mismatch risk: resolved by recording deterministic evidence from
  the actual left-to-right execution path.

### P1 issues

- Duplicate relational semantics risk: resolved by composing
  `core/relational-data` for table validation, projection, joins, and grouping
  rather than reimplementing those operations broadly.
- Aggregate scope risk: resolved by limiting public group aggregates to count
  and sum.
- Predicate ambiguity risk: resolved by explicit comparison operators and
  runtime errors for non-numeric ordering comparisons.

### P2 follow-up

- Consider a separate contract for query-plan alternatives or index-aware cost
  models if a future database-systems container needs optimiser comparisons.
- Consider labelled explain-plan nodes once multiple containers need the same
  step-by-step visual vocabulary.
