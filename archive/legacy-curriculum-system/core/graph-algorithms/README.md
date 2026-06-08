# @paideia/graph-algorithms

Pure graph-analysis kernels for Paideia simulations and containers. The package
computes canonical answers for traversal, shortest path, DAG order, connected
components, and minimum spanning tree questions without tracing, rendering, or
mutating caller input.

## Usage

```ts
import { dijkstraShortestPath } from "@paideia/graph-algorithms";

const result = dijkstraShortestPath(
  {
    directed: true,
    nodes: [{ id: "start" }, { id: "middle" }, { id: "finish" }],
    edges: [
      { source: "start", target: "finish", weight: 10 },
      { source: "start", target: "middle", weight: 2 },
      { source: "middle", target: "finish", weight: 3 },
    ],
  },
  "start",
  "finish",
);

if (result.ok) {
  console.log(result.value.path); // ["start", "middle", "finish"]
  console.log(result.value.distance); // 5
}
```

## Public API

- `neighbors`
- `breadthFirstSearch`
- `depthFirstSearch`
- `dijkstraShortestPath`
- `topologicalSort`
- `connectedComponents`
- `minimumSpanningTree`

All functions return `KernelResult` from `@paideia/shared`. Invalid graph shape,
unknown nodes, negative Dijkstra/MST weights, directed MST requests, and cyclic
topological-sort requests return `precondition-violated` errors.

## Determinism

The package preserves caller node and edge order for ties. It does not sort ids
alphabetically or use random seeds. This keeps classroom examples and snapshots
stable.

## Boundaries

Use `@paideia/algorithm-trace` when a learner needs to watch step-by-step
operations. Use `@paideia/graph-layout` when nodes need coordinates for display.
