# core/distributed-data-systems · agent contract

## What this module is
The deterministic distributed-data-systems kernel for Paideia simulations. It
owns finite HDFS/Spark teaching calculations: HDFS block/replication planning,
Spark partition counts, and shuffle-size estimates. It is pure TypeScript and
returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/distributed-data-systems`:

- `distributedDataTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type Bytes`
- `type Count`
- `type Fraction`
- `type HdfsBlockPlanInput`
- `type HdfsBlockPlanResult`
- `type SparkPartitionPlanInput`
- `type SparkPartitionPlanResult`
- `type ShuffleEstimateInput`
- `type ShuffleEstimateResult`
- `bytes(value: number): Bytes`
- `count(value: number): Count`
- `fraction(value: number): KernelResult<Fraction>`
- `hdfsBlockPlan(input: HdfsBlockPlanInput): KernelResult<HdfsBlockPlanResult>`
- `sparkPartitionPlan(input: SparkPartitionPlanInput): KernelResult<SparkPartitionPlanResult>`
- `shuffleEstimate(input: ShuffleEstimateInput): KernelResult<ShuffleEstimateResult>`

## Invariants the caller must preserve
- Public quantities use bytes, integer counts, and fractions in `[0, 1]`.
- Block size, replication factor, target records per partition, and reducer
  count are positive integers.
- File size, record count, and map output bytes are finite and non-negative.
- The Spark helpers are planning estimates only; they do not execute jobs.

## What this module does NOT do
- Does **not** connect to HDFS, Spark, Hadoop, S3, local files, or a cluster.
- Does **not** schedule tasks, place replicas on real nodes, run executors,
  sample data, or parse event logs.
- Does **not** model failures, stragglers, speculative execution, or network
  topology.
- Does **not** hide branch-specific datasets, cluster presets, or job configs.

## When to consider this module
Use `core/distributed-data-systems` when a sim is about to inline HDFS block
counts, replicated storage estimates, Spark partition counts, or shuffle-byte
arithmetic. If a sim needs cluster execution, event-log parsing, or realistic
scheduling, define a separate future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current distributed-systems
   or data-engineering sim that would consume the new primitive.
2. Add property tests for every new monotonicity or conservation invariant.
3. Use `core!:` for public API changes that alter units, rounding, or
   partition/shuffle semantics.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Adding Spark/Hadoop runtime dependencies or real cluster clients.
- Treating estimates as execution traces.
- Adding branch-specific datasets or cluster defaults.

## How the Anieyrudh Filter reads this module
The Filter checks that distributed-data visuals make the same finite planning
claims as this kernel and do not imply real cluster execution. HDFS block
diagrams, replicated-byte readouts, partition bars, and shuffle estimates that
disagree with these functions are rejected.
