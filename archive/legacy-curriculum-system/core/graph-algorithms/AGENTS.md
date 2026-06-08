# core/graph-algorithms - agent contract

## What this module is

Pure graph-analysis kernels for teaching graph algorithms and network structure.
It owns deterministic reference implementations for adjacency expansion,
reachability, shortest paths, topological order, connected components, and
minimum spanning trees. It returns algorithmic results only; tracing belongs in
`core/algorithm-trace`, and node-link coordinates belong in `core/graph-layout`.

## Public interface

Exports from `@paideia/graph-algorithms`:

- `GraphNode = { id: string }`
- `WeightedEdge = { source: string; target: string; weight?: number }`
- `WeightedGraph = { directed?: boolean; nodes: readonly GraphNode[]; edges: readonly WeightedEdge[] }`
- `Neighbor = { id: string; weight: number }`
- `NodeDistance = { id: string; distance: number }`
- `NodePredecessor = { id: string; predecessor: string | null }`
- `TraversalResult = { order: readonly string[]; distances: readonly NodeDistance[]; predecessors: readonly NodePredecessor[] }`
- `DepthFirstResult = { preorder: readonly string[]; postorder: readonly string[]; hasCycle: boolean }`
- `ShortestPathResult = { path: readonly string[]; distance: number; distances: readonly NodeDistance[]; predecessors: readonly NodePredecessor[] }`
- `TopologicalSortResult = { order: readonly string[] }`
- `ConnectedComponentsResult = { components: readonly (readonly string[])[] }`
- `MinimumSpanningTreeResult = { edges: readonly Required<WeightedEdge>[]; totalWeight: number }`
- `neighbors(g: WeightedGraph, nodeId: string): KernelResult<readonly Neighbor[]>`
- `breadthFirstSearch(g: WeightedGraph, start: string): KernelResult<TraversalResult>`
- `depthFirstSearch(g: WeightedGraph, start: string): KernelResult<DepthFirstResult>`
- `dijkstraShortestPath(g: WeightedGraph, start: string, target: string): KernelResult<ShortestPathResult>`
- `topologicalSort(g: WeightedGraph): KernelResult<TopologicalSortResult>`
- `connectedComponents(g: WeightedGraph): KernelResult<ConnectedComponentsResult>`
- `minimumSpanningTree(g: WeightedGraph): KernelResult<MinimumSpanningTreeResult>`

## Invariants the caller must preserve

- Node ids are unique, non-empty strings.
- Edges reference existing nodes.
- Edge weights, when supplied, are finite numbers. Missing weights are treated as
  `1`.
- Dijkstra and MST require non-negative weights.
- `topologicalSort` accepts directed acyclic graphs only.
- `minimumSpanningTree` accepts undirected graphs only.

Violations return `KernelResult.err("precondition-violated", ...)`.

## What this module does NOT do

- Does not emit animation steps - use `core/algorithm-trace`.
- Does not lay out graph nodes - use `core/graph-layout`.
- Does not render UI or SVG.
- Does not store graph state, cache results, or mutate input graphs.
- Does not model domain-specific semantics such as argument maps, concept maps,
  or road networks.

## When to consider this module

Use `core/graph-algorithms` when a sim or container needs canonical graph
answers: "Which nodes are reachable?", "What is the shortest path?", "Is this
graph a DAG?", "How many connected components are present?", or "Which edges
form a minimum spanning tree?"

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes that alter output order, tie-breaking, or error
   behavior for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Calling `Math.random()` or using nondeterministic tie-breaking.
- Sorting nodes or edges behind the caller's back. Input order is the teaching
  order.
- Mutating `nodes`, `edges`, or edge objects supplied by a caller.
- Adding graph rendering or tracing APIs to this package.
- Using branch-specific behavior flags.

## How the Anieyrudh Filter reads this module

The Filter probes that the algorithmic answer matches the graph structure:
unreachable nodes stay at `Infinity`, shortest paths respect edge weights,
cycles block topological order, and spanning trees never invent, drop, or
reverse edges. A visually convenient answer that changes graph facts fails
review.
