# @paideia/ml-clustering

Deterministic teaching-scale clustering calculations for Paideia simulations.

Use this package when a sim needs shared numbers for squared Euclidean distance,
nearest-centroid assignment, centroid recomputation, or one deterministic
k-means step with caller-provided centroids.

## Example

```ts
import { kMeansStep } from "@paideia/ml-clustering";

const step = kMeansStep({
  points: [[0], [2], [10]],
  centroids: [[0], [10]],
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as mixed vector
dimensions, return `err(...)` rather than throwing.

## Scope

This package models deterministic k-means primitives only. It does not perform
random initialisation, convergence loops, train/test splitting, or ML framework
training.
