# core/relational-data - agent contract

## What this module is

Pure relational-table kernels for SQL and database simulations. It owns
deterministic table validation, projection, joins, grouping, and aggregate
calculations over small educational datasets. It returns readonly records only;
SQL parsing, query editors, database engines, storage indexes, execution plans,
and visual Venn diagrams live elsewhere.

Rows are plain scalar records. Column names are caller-defined strings and are
case-sensitive. Join output columns are prefixed with the input table names so
result rows stay unambiguous.

## Public interface

Exports from `@paideia/relational-data`:

- `CellValue = string | number | boolean | null`
- `ColumnName = Brand<string, "RelationalData.ColumnName">`
- `TableName = Brand<string, "RelationalData.TableName">`
- `Row = Readonly<Record<string, CellValue>>`
- `Table = { name: TableName; rows: readonly Row[] }`
- `JoinKind = "inner" | "left" | "right" | "full"`
- `JoinInput = { left: Table; right: Table; leftKey: ColumnName; rightKey: ColumnName; kind: JoinKind }`
- `AggregateOp = "count" | "sum" | "avg" | "min" | "max"`
- `AggregateSpec = { output: ColumnName; op: AggregateOp; column?: ColumnName }`
- `GroupByInput = { table: Table; keys: readonly ColumnName[]; aggregates: readonly AggregateSpec[] }`
- `columnName(value: string): KernelResult<ColumnName>`
- `tableName(value: string): KernelResult<TableName>`
- `validateRow(row: Row): KernelResult<Row>`
- `validateTable(table: Table): KernelResult<Table>`
- `projectRows(table: Table, columns: readonly ColumnName[]): KernelResult<Table>`
- `relationalJoin(input: JoinInput): KernelResult<Table>`
- `groupBy(input: GroupByInput): KernelResult<Table>`
- `tableCardinality(table: Table): KernelResult<number>`

## Invariants the caller must preserve

- Table and column names must be non-empty, trimmed strings.
- Row values must be string, finite number, boolean, or null.
- Every row in a table must have the same set of columns.
- Projection and grouping columns must exist in the table.
- Join keys must exist in their respective tables.
- Join key values may be string, finite number, boolean, or null. Null only
  matches null.
- Sum, average, min, and max aggregates require numeric non-null values.
- Aggregate output names must not collide with group key names.
- Public results must never contain `NaN` or `Infinity`.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not parse SQL or execute arbitrary query strings.
- Does not render tables, Venn diagrams, query plans, or ER diagrams.
- Does not persist data or connect to databases.
- Does not model indexes, transactions, isolation levels, or storage costs.
- Does not infer schemas beyond row-column consistency checks.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/relational-data` when a sim needs canonical table validation, joins,
projection, grouping, or aggregate calculations. If a SQL or analytics sim is
about to inline join row assembly, GROUP BY totals, row-count checks, or null
padding logic, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to join semantics, null behavior, or public types.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned rows or tables.
- Treating missing columns as null without an explicit outer join.
- Adding a string SQL parser inside this deterministic kernel.
- Hidden global caches, implicit schemas, or external data fetches.
- Branch-specific defaults (`if 50.043 then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed SQL results match this kernel: inner joins drop
unmatched rows; outer joins visibly pad missing-side columns with null; GROUP BY
outputs use the declared keys; aggregate readouts show which column was counted,
summed, or averaged; and result tables do not hide column-name collisions.
