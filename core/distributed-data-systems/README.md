# @paideia/distributed-data-systems

Deterministic HDFS/Spark teaching calculations for Paideia simulations.

Use this package when a sim needs shared numbers for HDFS block counts,
replicated storage, Spark partition counts, or shuffle-size estimates.

## Example

```ts
import {
  bytes,
  count,
  hdfsBlockPlan,
} from "@paideia/distributed-data-systems";

const plan = hdfsBlockPlan({
  fileSizeBytes: bytes(300),
  blockSizeBytes: bytes(128),
  replicationFactor: count(3),
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero block
size or invalid selectivity, return `err(...)` rather than throwing.

## Scope

This package models scalar teaching estimates. It does not connect to HDFS,
Spark, Hadoop, S3, local files, or any real cluster.
