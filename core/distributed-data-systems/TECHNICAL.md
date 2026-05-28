# @paideia/distributed-data-systems Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: unit brands,
constructors, input/result types, and pure kernel functions for HDFS block
planning, Spark partition planning, and shuffle-size estimates.

## Numerical model

```text
blockCount = ceil(fileSizeBytes / blockSizeBytes)
finalBlockBytes = fileSizeBytes - blockSizeBytes * (blockCount - 1)
replicatedBytes = fileSizeBytes * replicationFactor
partitionCount = ceil(recordCount / targetRecordsPerPartition)
shuffleBytes = mapOutputBytes * selectivity
bytesPerReducer = shuffleBytes / reducerCount
```

Zero file size and zero record count produce zero blocks/partitions. This is a
planning kernel, not an execution engine.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Non-negative sizes and counts where zero is meaningful | `nonNegative` guards return `precondition-violated` |
| Positive integer denominators and counts | `positiveInteger` guards return `precondition-violated` |
| Selectivity is in `[0, 1]` | `fraction` returns `out-of-domain` |
| Compound results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers every public function with formula examples, invalid
input paths, error codes, immutable results, and a property test for monotonic
HDFS block counts as file size increases.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add deterministic replica-placement teaching helpers after a consuming
  container defines rack/node assumptions.
- Add stage-DAG critical-path estimates after a Spark DAG container defines
  the stage schema.
- Add skew/straggler examples only as finite evidence, not execution traces.

## Anieyrudh Filter pass

- P0 issues checked: no cluster client, no Spark/Hadoop runtime dependency, no
  file access, no branch-specific presets, no hidden mutable global state, no
  public `any`.
- P1 issues checked: public API is deliberately narrow, all expected failures
  return `KernelResult.err`, estimates are not presented as execution traces,
  and compound results are immutable.
- High-bandwidth questions surfaced: real cluster execution, event-log parsing,
  replica placement, scheduling, network topology, failures, and speculative
  execution are intentionally deferred until consuming containers define the
  required contract.
- Outcome: the kernel provides canonical planning numbers for HDFS/Spark
  visuals; any visual that implies these estimates came from a real cluster
  should fail review.
