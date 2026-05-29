# core/query-engine - agent contract

## What this module is

The deterministic educational query-engine kernel for small relational datasets.
It owns query-plan execution over already-materialised tables: row selection,
projection, equi-join, group/count/sum, and simple cost evidence. It composes
`core/relational-data` for table validation and relational operators. It does
not parse SQL, optimise plans, store data, execute against databases, or render
query plans.

## Public interface

Exports from `@paideia/query-engine`:

- `QueryComparisonOperator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte"`
- `QueryComparisonPredicate = { kind: "comparison"; column: ColumnName; op: QueryComparisonOperator; value: CellValue }`
- `QueryPredicate = QueryComparisonPredicate | { kind: "and"; predicates: readonly QueryPredicate[] } | { kind: "or"; predicates: readonly QueryPredicate[] } | { kind: "not"; predicate: QueryPredicate }`
- `SelectStep = { kind: "select"; predicate: QueryPredicate }`
- `ProjectStep = { kind: "project"; columns: readonly ColumnName[] }`
- `EquiJoinStep = { kind: "equi-join"; right: Table; leftKey: ColumnName; rightKey: ColumnName; joinKind?: "inner" | "left" }`
- `GroupAggregateSpec = { output: ColumnName; op: "count" | "sum"; column?: ColumnName }`
- `GroupStep = { kind: "group"; keys: readonly ColumnName[]; aggregates: readonly GroupAggregateSpec[] }`
- `QueryStep = SelectStep | ProjectStep | EquiJoinStep | GroupStep`
- `QueryPlan = { source: Table; steps: readonly QueryStep[] }`
- `QueryCostStep = { index: number; kind: QueryStep["kind"]; inputRows: number; outputRows: number; predicateComparisons: number; joinComparisons: number; projectedColumns: number }`
- `QueryCostEvidence = { inputRows: number; outputRows: number; predicateComparisons: number; joinComparisons: number; projectedColumns: number; steps: readonly QueryCostStep[] }`
- `QueryExecution = { table: Table; evidence: QueryCostEvidence }`
- `evaluatePredicate(row: Row, predicate: QueryPredicate): KernelResult<boolean>`
- `selectRows(table: Table, predicate: QueryPredicate): KernelResult<QueryExecution>`
- `executeQuery(plan: QueryPlan): KernelResult<QueryExecution>`

## Invariants the caller must preserve

- Source and joined tables must satisfy `core/relational-data` table invariants.
- Predicate columns must exist on the current table.
- Comparison values must be scalar finite `CellValue`s.
- Ordering comparisons (`lt`, `lte`, `gt`, `gte`) require finite numeric row and
  predicate values.
- `and` and `or` predicates must contain at least one child predicate.
- Query plans execute left-to-right; cost evidence describes this execution, not
  an optimiser estimate.
- This module supports inner and left joins only. Use `core/relational-data`
  directly for right/full join teaching.
- Group aggregates are intentionally limited to `count` and `sum`.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not parse SQL or execute arbitrary query strings.
- Does not optimise, reorder, or cost alternative plans.
- Does not model indexes, storage pages, transactions, isolation, or distributed
  query execution.
- Does not render plans, tables, charts, or SQL editors.
- Does not persist data or connect to databases.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/query-engine` when a simulation needs a canonical, deterministic
execution trace for small relational query plans: apply a predicate, project
columns, join a lookup table, group rows, and explain how many rows or
comparisons the plan performed. Use `core/relational-data` directly for isolated
projection, join, or aggregation examples that do not need plan/evidence output.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to predicate semantics, join support, aggregate
   support, or cost-evidence fields.

## Anti-patterns

- Adding a SQL parser inside the kernel.
- Mutating caller-owned rows, tables, predicates, or plans.
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Treating cost evidence as an optimiser or storage-engine cost model.
- Adding hidden global caches, implicit schemas, or external data fetches.
- Branch-specific defaults.

## How the Anieyrudh Filter reads this module

The Filter checks that learner-facing query traces conserve rows and predicates:
selection outputs contain exactly the rows whose predicates evaluate true,
projection outputs only requested columns, joins match declared keys, group
outputs use declared count/sum aggregates, and cost evidence matches the
left-to-right execution rather than a hidden optimiser story.
