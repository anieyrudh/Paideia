---
subject: cs
concept: graph-algorithm-explorer
branch: shared
level: Shared core
syllabus_ref: Shared computing / Graph algorithms / Traversal and shortest paths
prerequisites:
  - graph-representation
  - recursion-or-iteration
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Graph Algorithm Explorer

## First-Principles Explanation

A graph algorithm is a rule for discovering structure from vertices and edges. The drawing helps humans see the graph, but the algorithm reads the adjacency list, the start node, the edge directions, and any edge weights. Breadth-first search expands by number of edges from the start, depth-first search follows one branch before backtracking, and Dijkstra's algorithm repeatedly settles the unsettled node with the smallest known non-negative total weight.

The useful habit is to name the invariant before trusting the result. BFS preserves the invariant that nodes leave the frontier in nondecreasing edge-count distance. DFS preserves a stack discipline and records a branch-first visitation trace. Dijkstra preserves the settled-set invariant: once a node with minimum tentative distance is settled, no later non-negative edge can improve it.

## Key Definitions

- Graph: a set of nodes joined by directed or undirected edges.
- Edge weight: a numerical cost attached to an edge, such as minutes, distance, or risk units.
- Frontier: discovered nodes whose outgoing edges have not all been processed yet.
- Visited set: nodes that the traversal has already removed from the frontier and processed.
- Shortest path: the path with minimum total edge weight, not necessarily the fewest edges.
- Trace: the ordered record of algorithm operations used to explain why the final answer follows.

## Why It Matters

Graphs model routes, dependency plans, communication networks, web links, social ties, and state spaces. Choosing the wrong algorithm can return a path that looks plausible but optimizes the wrong quantity. A learner who can inspect frontier growth and settled distances is less likely to confuse screen position, number of hops, and weighted cost.

## Canonical Examples

- In an unweighted maze, BFS gives the route with the fewest moves.
- In a road network with travel times, Dijkstra can prefer a route with more segments but lower total time.
- In a prerequisite graph, DFS can expose a branch-first dependency chain and help detect cycles.
- In an undirected network, connected components group nodes that can reach one another.

## Common Misconceptions

- Visual distance equals edge weight. A layout is only a drawing; the labelled weights are the algorithm input.
- Visited order is unique for every graph. Tie order follows the supplied adjacency order, so deterministic algorithms still depend on representation.
- DFS is a shortest-path method. DFS explores deeply; it does not optimize edge count or total cost.
- Fewer edges means cheaper path. That is true only when every edge has the same cost and the objective is hop count.

## Transfer

When a new problem mentions routes, prerequisites, states, or networks, first ask what the edges mean and what objective must be optimized. Then choose the algorithm whose invariant matches that objective, and inspect the trace for the frontier, visited set, and distance updates that justify the answer.
