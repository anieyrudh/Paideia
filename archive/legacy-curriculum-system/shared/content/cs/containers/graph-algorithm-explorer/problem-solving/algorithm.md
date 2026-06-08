# Problem-Solving Algorithm

Use this decision procedure when a graph problem asks for a route, reachability claim, or traversal explanation.

1. Identify the graph representation: node set, edge set, direction, edge weights, and start or target nodes.
2. State the objective in learner language: fewest edges, lowest total weight, branch-first exploration, or connectivity.
3. Choose the algorithm whose invariant matches the objective.
4. Run the trace and record the frontier, visited set, predecessor links, and distance table.
5. Check the stopping condition: target visited for traversal evidence, or target settled for Dijkstra.
6. Reconstruct the answer from predecessor links or the final visited order.
7. Explain why the invariant, not the drawing, justifies the answer.

## Strategy Tree

- If every edge counts equally and the task asks for the fewest edges, use BFS.
- If the task asks for a branch-first trace or cycle-inspection path, use DFS.
- If non-negative weights matter, use Dijkstra.
- If the task asks whether all nodes are reachable in an undirected graph, inspect connected components.

## Proof Outline

BFS processes frontier layers in increasing hop count, so the first time it reaches a node it has found a fewest-edge route. DFS is not an optimization algorithm; it is useful because the stack discipline exposes dependency chains and backtracking. Dijkstra is valid for non-negative weights because the unsettled node with smallest tentative distance cannot later be improved by adding more non-negative edge cost.
