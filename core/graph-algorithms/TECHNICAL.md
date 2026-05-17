# @paideia/graph-algorithms Technical Notes

## Public Interface Summary

The package exports immutable graph value types plus pure kernels for:

- adjacency expansion with `neighbors`
- unweighted reachability with `breadthFirstSearch`
- DFS preorder, postorder, and cycle detection with `depthFirstSearch`
- non-negative weighted shortest paths with `dijkstraShortestPath`
- DAG ordering with `topologicalSort`
- weak connected components with `connectedComponents`
- undirected minimum spanning trees with `minimumSpanningTree`

## Invariant Enforcement

| Invariant | Enforcement |
| --- | --- |
| Unique, non-empty node ids | `validateGraph` returns `precondition-violated` |
| Edges reference existing nodes | `validateGraph` returns `precondition-violated` |
| Weights are finite | `validateGraph` returns `precondition-violated` |
| Dijkstra and MST use non-negative weights | `validateGraph(..., { requireNonNegativeWeights: true })` |
| Topological sort uses directed DAGs | Runtime directed check plus Kahn cycle check |
| MST uses undirected connected graphs | Runtime directed check plus `n - 1` edge check |
| No input mutation | Kernels build local maps, queues, and edge copies; tests snapshot inputs |
| Deterministic output | Node order and original edge order are the only tie-breakers |

## Algorithm Notes

- BFS uses a FIFO cursor over a local queue and records edge-count distances.
- DFS uses color states (`visiting`, `visited`) for cycle detection. In
  undirected graphs, the immediate parent edge is ignored for back-edge checks.
- Dijkstra uses the package's deterministic node order for equal-distance
  selection. This is `O(V^2 + E)` and intentionally dependency-free for teaching
  graph sizes.
- Topological sort uses Kahn's algorithm and returns an error if any node
  remains after zero-indegree expansion.
- MST uses Kruskal's algorithm with a local union-find structure and stable
  sorting by weight, then original edge index.

## Dependency And License Notes

Runtime dependencies:

- `@paideia/shared` (`workspace:*`)

No third-party runtime dependency is introduced, so there is no GPL, AGPL, LGPL,
SSPL, BUSL, or Commons-Clause runtime license exposure.

## Anieyrudh Filter Pass

- Shortest-path probes include a graph where the fewer-edge path is not the
  lower-weight path.
- Reachability probes keep unreachable nodes visible with `Infinity` distance
  rather than silently dropping them.
- Topological-sort probes reject cycles instead of returning a partial order.
- MST probes prove the returned tree has `n - 1` edges for generated connected
  graphs and preserves caller edge orientation in the result.
