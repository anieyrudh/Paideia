# Transfer Problem Rubric: Route Planning Shortest Path

## Prompt

A delivery map has five intersections. The route with the fewest road segments is not the route with the lowest travel time. Choose whether to model the task with BFS, DFS, or Dijkstra, then justify the invariant you will inspect before trusting the answer.

## Rubric

- Identifies intersections as nodes and roads as weighted edges.
- States that travel time is a weight objective, so Dijkstra is the matching algorithm when all weights are non-negative.
- Explains why BFS would optimize hop count rather than total travel time.
- Uses predecessor links or the distance table to reconstruct the chosen route.
- Explicitly rejects visual closeness as evidence of lower cost.
