# @paideia/transactions

Deterministic transaction-schedule kernels for database concurrency containers.
The package owns symbolic schedule validation, conflicts, precedence graphs,
conflict serializability, basic anomaly labels, and recoverability checks.

It does not execute SQL or implement locking/MVCC. Simulations should use this
package for the canonical trace analysis, then render their own timelines and
graphs.

```ts
import {
  isConflictSerializable,
  schedule,
  scheduleOperation,
} from "@paideia/transactions";

const r1 = scheduleOperation({ tx: "T1", kind: "read", item: "A" });
const w2 = scheduleOperation({ tx: "T2", kind: "write", item: "A" });
if (!r1.ok) throw new Error(r1.error.message);
if (!w2.ok) throw new Error(w2.error.message);

const trace = schedule([r1.value, w2.value]);
if (!trace.ok) throw new Error(trace.error.message);

const serializable = isConflictSerializable(trace.value);
if (!serializable.ok) throw new Error(serializable.error.message);
```

Use this when a sim needs to show why a schedule is or is not conflict
serializable, where dirty reads occur, or why a commit order is unrecoverable.
