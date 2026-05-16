import { err, ok, type KernelResult } from "@paideia/shared";
import { adjacency, validateGraph } from "./graph.js";
import type { Graph, Trace, TraceStep, TraversalAlgorithm } from "./types.js";

export const traceTraversal = (
  graph: Graph,
  start: string,
  alg: TraversalAlgorithm,
): KernelResult<Trace<string>> => {
  if (alg !== "bfs" && alg !== "dfs") {
    return err("precondition-violated", `Unsupported traversal algorithm: ${String(alg)}`);
  }

  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const startIndex = valid.value.get(start);
  if (startIndex === undefined) {
    return err("precondition-violated", `Traversal start node does not exist: ${start}`);
  }

  const ids = graph.nodes.map((node) => node.id);
  const next = adjacency(graph);
  const visited = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: TraceStep[] = [];

  if (alg === "bfs") {
    const queue: string[] = [start];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      visitedOrder.push(id);
      steps.push({ kind: "visit", at: [valid.value.get(id) ?? 0], value: id });
      for (const neighbor of next.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          steps.push({ kind: "mark", at: [valid.value.get(neighbor) ?? 0], value: neighbor });
          queue.push(neighbor);
        }
      }
    }
  } else {
    const stack: string[] = [start];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      visitedOrder.push(id);
      steps.push({ kind: "visit", at: [valid.value.get(id) ?? 0], value: id });
      const neighbors = next.get(id) ?? [];
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        const neighbor = neighbors[i];
        if (neighbor !== undefined && !visited.has(neighbor)) {
          steps.push({ kind: "mark", at: [valid.value.get(neighbor) ?? 0], value: neighbor });
          stack.push(neighbor);
        }
      }
    }
  }

  return ok({
    initial: ids,
    steps,
    final: visitedOrder,
    meta: {
      algorithm: alg,
      n: graph.nodes.length,
      comparisons: 0,
      swaps: 0,
    },
  });
};
