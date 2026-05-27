# @paideia/relational-data technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: scalar row
types, branded table and column names, projection, joins, grouping, aggregates,
and cardinality.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Table and column names are non-empty and trimmed | `tableName` and `columnName`. |
| Row values are scalar and finite | `validateRow`. |
| Tables have consistent row columns | `validateTable`. |
| Projection and grouping columns exist | `projectRows` and `groupBy` guards. |
| Join keys exist | `relationalJoin` guards. |
| Joined output prefixes stay unambiguous | `relationalJoin` rejects same-name table joins. |
| Outer joins pad missing rows explicitly | `prefixedRow` writes null for the missing side. |
| Numeric aggregates use numeric values | `aggregateValue`. |
| Aggregate outputs do not collide with group keys | `validateAggregates`. |
| Inputs are not mutated | Functions copy rows or allocate output records only. |

## Error Model

- `out-of-domain`: non-scalar row values, non-finite numeric values, or numeric
  aggregates over non-numeric cells.
- `precondition-violated`: invalid names, inconsistent schemas, missing
  columns, duplicate projection/grouping columns, unsupported operations, or
  output-name collisions.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No SQL parser, database engine, or external runtime dependency is bundled.

## Semantics Notes

Joins use strict scalar equality. Null matches null because this is a
relational-table teaching kernel, not a full SQL runtime. Containers that want
SQL three-valued-logic nuance should display that explicitly at the UI layer or
open a core-change proposal.

Group order follows first encounter order in the input table. This gives stable
student-facing traces without requiring a separate sort primitive.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: text-only SQL results hiding wrong joins. Resolution: join output is
  deterministic and table-prefixed so result visualisations can show exact row
  provenance.
- P0 check: non-finite aggregate outputs. Resolution: row validation rejects
  non-finite numbers and aggregate results are finite-checked.
- P0 check: hidden parser or database runtime. Resolution: the kernel accepts
  structured table operations only and performs no SQL parsing or I/O.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: missing columns silently treated as null. Resolution: missing
  projection, grouping, join, or aggregate columns return
  `precondition-violated`; only explicit outer-join padding writes null.
- P1 check: column collisions in joined output. Resolution: every join output
  column is prefixed with its source table name, and same-name table joins are
  rejected.
- P1 check: aggregate output collisions. Resolution: aggregate output names
  cannot collide with group key names or other aggregate outputs.
- Audit P0: `count(column)` over a missing column silently counted every row.
  Resolution: aggregate column existence is checked for every aggregate that
  names a column, including `count(column)`.
- Audit P0: same-name joins could overwrite prefixed output columns. Resolution:
  `relationalJoin` rejects same-name table joins.

High-bandwidth questions surfaced:

- Should SQL null semantics (`NULL != NULL`) and three-valued logic be owned by
  this kernel? Deferred; current v0 uses scalar equality for visual teaching
  joins, with the nuance documented for future extension.

P2 cleanup:

- Add `core/relational-data` to `docs/core-modules.md` during the broader core
  catalogue refresh.
