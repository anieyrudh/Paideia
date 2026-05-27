# core/transactions technical notes

## Public interface

The package exports branded transaction/data identifiers, schedule operation
types, conflicts, precedence graphs, anomaly reports, recoverability reports,
constructors, and pure schedule-analysis functions.

## Invariant enforcement

| Invariant | Enforcement |
|---|---|
| Transaction and data identifiers are non-empty and unpadded | `transactionId()` / `dataItem()` guards |
| Read/write operations require data items | `scheduleOperation()` and `validateOperation()` guards |
| Commit/abort operations reject data items | `scheduleOperation()` and `validateOperation()` guards |
| No operation appears after a transaction finishes | `schedule()` guard |
| Schedules stay bounded to teaching traces | `schedule()` rejects more than 200 operations |
| Conflicts require same item, different transactions, and at least one write | `extractConflicts()` logic and regression tests |
| Conflict serializability follows graph acyclicity | `isConflictSerializable()` calls `precedenceGraph()` and cycle detection |
| Recoverability checks commit ordering after reads from uncommitted writes | `recoverability()` guard logic and tests, including aborted-reader falsifier |
| Caller-owned schedules are not mutated | Regression test |

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

- Potential DBMS runtime scope creep: resolved by excluding SQL execution,
  lock managers, MVCC, deadlock detection, rollback, and recovery engines from
  the contract and implementation.
- Potential unbounded trace analysis: resolved by rejecting schedules with more
  than 200 operations.

P1 issues + resolution:

- Anomaly naming can overpromise full isolation-level modelling: addressed by
  limiting the public API to trace-level anomaly labels, requiring committed
  intervening writes for non-repeatable reads, and requiring an intervening
  read/write/commit chain for lost-update labels.
- Conflict-serializability can be easy to misrepresent visually: addressed by
  returning concrete conflict edges with operation indexes for graph rendering.

High-bandwidth questions surfaced:

- Future database containers may need two-phase locking or MVCC visualizers.
  Those should be separate kernels or explicit extensions, not hidden inside
  this trace-analysis kernel.

## P2 cleanup backlog

- Add `core/transactions` to `docs/core-modules.md` during the next broader core
  catalogue refresh.
