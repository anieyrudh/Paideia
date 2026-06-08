# core/indexing-query-cost - agent contract

## What this module is

Pure query-cost kernels for database indexing simulations. It owns deterministic
table statistics validation, selectivity estimates, sequential scan costs,
B+tree height estimates, index probe/range costs, simple maintenance costs, and
plan comparison for small educational scenarios. It returns numeric estimates
with assumptions surfaced as values; SQL parsing, real optimizer rules, storage
engines, histograms, and UI diagrams live elsewhere.

The unit is logical page I/O. Callers may map one page I/O to wall-clock time in
their own sim, but this kernel does not model hardware or latency.

## Public interface

Exports from `@paideia/indexing-query-cost`:

- `PositiveInteger = Brand<number, "IndexingQueryCost.PositiveInteger">`
- `NonNegativeNumber = Brand<number, "IndexingQueryCost.NonNegativeNumber">`
- `Selectivity = Brand<number, "IndexingQueryCost.Selectivity">`
- `TableStats = { rows: PositiveInteger; pages: PositiveInteger; distinctValues?: PositiveInteger }`
- `IndexKind = "primary-btree" | "secondary-btree" | "hash"`
- `IndexStats = { kind: IndexKind; leafPages: PositiveInteger; fanout: PositiveInteger; clustered: boolean }`
- `PredicateKind = "equality" | "range"`
- `PredicateEstimate = { kind: PredicateKind; selectivity: Selectivity; expectedRows: NonNegativeNumber; expectedPages: NonNegativeNumber; assumptions: readonly string[] }`
- `PlanEstimate = { plan: "table-scan" | "index-equality" | "index-range" | "hash-equality"; costPages: NonNegativeNumber; expectedRows: NonNegativeNumber; assumptions: readonly string[] }`
- `positiveInteger(value: number): KernelResult<PositiveInteger>`
- `nonNegativeNumber(value: number): KernelResult<NonNegativeNumber>`
- `selectivity(value: number): KernelResult<Selectivity>`
- `tableStats(input: { rows: number; pages: number; distinctValues?: number }): KernelResult<TableStats>`
- `indexStats(input: { kind: IndexKind; leafPages: number; fanout: number; clustered: boolean }): KernelResult<IndexStats>`
- `estimateSelectivity(table: TableStats, kind: PredicateKind, selectivityHint?: Selectivity): KernelResult<PredicateEstimate>`
- `btreeHeight(index: IndexStats): KernelResult<PositiveInteger>`
- `tableScanCost(table: TableStats): KernelResult<PlanEstimate>`
- `indexLookupCost(table: TableStats, index: IndexStats, predicate: PredicateEstimate): KernelResult<PlanEstimate>`
- `comparePlans(plans: readonly PlanEstimate[]): KernelResult<PlanEstimate>`
- `insertMaintenanceCost(indexes: readonly IndexStats[]): KernelResult<NonNegativeNumber>`

## Invariants the caller must preserve

- Table rows, pages, distinct values, leaf pages, and fanout must be finite
  integers.
- Positive counts must be at least 1. Fanout must be at least 2.
- Selectivity must be in `[0, 1]`.
- `distinctValues` cannot exceed `rows`.
- Estimated rows and pages are never `NaN` or `Infinity`.
- Selectivity assumptions must be surfaced on predicate estimates.
- Hash indexes support equality predicates only.
- B+tree index costs use the kernel's own height calculation.
- Clustered range/equality access estimates data-page visits by selectivity;
  unclustered access estimates one data-page visit per expected row.
- Plan comparison is deterministic: lowest page cost wins, ties preserve input
  order.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not parse SQL, build query plans, or reorder joins.
- Does not model real DBMS buffer pools, caching, compression, MVCC, locking,
  cardinality histograms, or CPU time.
- Does not render indexes, query plans, or explain tables.
- Does not infer table statistics from row data.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/indexing-query-cost` when a database sim needs canonical page-I/O
estimates for table scans, equality lookups, range lookups, B+tree height, or
index maintenance. If a container is about to inline selectivity math,
fanout-height calculations, or plan-cost comparison, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to cost semantics, index-kind support, or public
   plan shape.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Treating SQL strings as input to this deterministic kernel.
- Hiding a DBMS-specific optimizer or hardware model behind generic names.
- Mutating caller-owned plan or index arrays.
- Hidden global caches, random estimates, or external data fetches.
- Branch-specific defaults (`if 50.043 then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed index-cost explanations match this kernel:
table scans cost all table pages; B+tree probes include tree height; unclustered
lookups visibly cost more data-page visits than clustered lookups for the same
predicate; hash indexes reject range predicates; and plan comparisons reveal the
assumptions, not only the winning number.
