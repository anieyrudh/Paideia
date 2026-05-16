# @paideia/algorithm-trace

Deterministic reference traces for teaching sorting, searching, and simple graph
traversal algorithms. Trace generation is pure: inputs are copied, never
mutated, and a trace can be rendered later without rerunning the algorithm.

```ts
import { traceSort } from "@paideia/algorithm-trace";

const trace = traceSort([5, 1, 4, 2], "insertion");
```

The visualizer accepts an existing trace and steps through recorded operations.
It does not execute algorithm code inside React.
