# @paideia/graph-layout

Deterministic graph and tree layout kernels for node-link educational diagrams.
The package accepts immutable graph structures and returns coordinate-only
layout results that renderers can consume without re-running layout.

```ts
import { forceDirected2D } from "@paideia/graph-layout";

const layout = forceDirected2D(
  {
    nodes: [{ id: "prediction" }, { id: "observation" }],
    links: [{ source: "prediction", target: "observation" }],
  },
  { seed: 0, iterations: 80 },
);
```

The default seed is `0`; no layout function uses ambient randomness. Inputs are
validated for unique non-empty node ids and links that reference existing ids.
Parallel links are preserved because the layout result mirrors the graph
structure supplied by the caller.

React exports are intentionally small. They render an existing layout and never
run simulation work inside React.
