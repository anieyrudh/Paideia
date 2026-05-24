# core/transactions - agent contract

## What this module is

Pure transaction-schedule kernels for database concurrency simulations. It owns
deterministic schedule validation, conflict extraction, precedence graph
construction, conflict-serializability checks, recoverability checks, and basic
anomaly classification over small educational traces. It returns symbolic
results only; SQL execution, locks, MVCC engines, storage, query plans, and UI
diagrams live elsewhere.

Schedules are ordered operation traces. Transaction and data-item identifiers
are caller-defined strings and case-sensitive.

## Public interface

Exports from `@paideia/transactions`:

- `TransactionId = Brand<string, "Transactions.TransactionId">`
- `DataItem = Brand<string, "Transactions.DataItem">`
- `OperationKind = "read" | "write" | "commit" | "abort"`
- `ScheduleOperation = { tx: TransactionId; kind: OperationKind; item?: DataItem }`
- `Schedule = readonly ScheduleOperation[]`
- `Conflict = { from: TransactionId; to: TransactionId; item: DataItem; leftIndex: number; rightIndex: number }`
- `PrecedenceGraph = { nodes: readonly TransactionId[]; edges: readonly Conflict[] }`
- `AnomalyKind = "dirty-read" | "lost-update" | "non-repeatable-read" | "dirty-write"`
- `Anomaly = { kind: AnomalyKind; tx: TransactionId; item: DataItem; evidence: readonly number[] }`
- `RecoverabilityReport = { recoverable: boolean; cascadingAbortRisk: boolean; violations: readonly string[] }`
- `transactionId(value: string): KernelResult<TransactionId>`
- `dataItem(value: string): KernelResult<DataItem>`
- `scheduleOperation(input: { tx: string; kind: OperationKind; item?: string }): KernelResult<ScheduleOperation>`
- `schedule(operations: readonly ScheduleOperation[]): KernelResult<Schedule>`
- `extractConflicts(schedule: Schedule): KernelResult<readonly Conflict[]>`
- `precedenceGraph(schedule: Schedule): KernelResult<PrecedenceGraph>`
- `isConflictSerializable(schedule: Schedule): KernelResult<boolean>`
- `classifyAnomalies(schedule: Schedule): KernelResult<readonly Anomaly[]>`
- `recoverability(schedule: Schedule): KernelResult<RecoverabilityReport>`

## Invariants the caller must preserve

- Transaction and data-item identifiers must be non-empty, trimmed strings.
- Read and write operations require a data item.
- Commit and abort operations must not include a data item.
- A transaction may finish at most once.
- No operation may appear after the same transaction commits or aborts.
- A schedule is limited to 200 operations for teaching use.
- Conflicts are ordered operation pairs from different transactions on the same
  item where at least one side is a write.
- Conflict serializability is true exactly when the precedence graph is acyclic.
- Recoverability requires transactions to commit only after any transaction
  whose uncommitted write they read has committed.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not execute SQL or mutate table data.
- Does not implement a lock manager, timestamp ordering, MVCC, deadlock
  detection, logging, rollback, or recovery.
- Does not model isolation levels beyond trace-level anomaly names.
- Does not render wait-for graphs or precedence diagrams.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/transactions` when a database sim needs canonical conflict pairs,
precedence graphs, serializability verdicts, dirty-read/lost-update examples, or
recoverability checks. If a container is about to inline schedule graph logic or
anomaly classification, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to anomaly semantics, recoverability semantics, or
   public schedule shape.

## Anti-patterns (will be rejected in PR review)

- Simulating a real DBMS engine or lock table inside this kernel.
- Treating missing data items as a wildcard item.
- Mutating caller-owned schedule arrays.
- Hidden global caches, random traces, or external data fetches.
- Branch-specific defaults (`if 50.043 then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed transaction traces match this kernel: conflicts
name both operations and the item; cycles in the precedence graph block
conflict-serializability claims; dirty-read explanations identify the writer
that had not committed; and recoverability explanations name the commit ordering
that caused the violation.
