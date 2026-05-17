import { describe, expect, it } from "vitest";
import {
  breadthFirstSearch,
  connectedComponents,
  depthFirstSearch,
  dijkstraShortestPath,
  minimumSpanningTree,
  neighbors,
  topologicalSort,
  type WeightedGraph,
} from "./index.js";

const graph = {
  directed: true,
  nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
  edges: [
    { source: "a", target: "b", weight: 2 },
    { source: "a", target: "c", weight: 1 },
    { source: "c", target: "b", weight: 1 },
  ],
} as const satisfies WeightedGraph;

describe("@paideia/graph-algorithms", () => {
  it("returns deterministic neighbors without mutating input", () => {
    const before = JSON.stringify(graph);
    const result = neighbors(graph, "a");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        { id: "b", weight: 2 },
        { id: "c", weight: 1 },
      ]);
    }
    expect(JSON.stringify(graph)).toBe(before);
  });

  it("runs breadth-first search with distances and predecessors", () => {
    const result = breadthFirstSearch(graph, "a");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.order).toEqual(["a", "b", "c"]);
      expect(result.value.distances).toEqual([
        { id: "a", distance: 0 },
        { id: "b", distance: 1 },
        { id: "c", distance: 1 },
        { id: "d", distance: Number.POSITIVE_INFINITY },
      ]);
      expect(result.value.predecessors).toEqual([
        { id: "a", predecessor: null },
        { id: "b", predecessor: "a" },
        { id: "c", predecessor: "a" },
        { id: "d", predecessor: null },
      ]);
    }
  });

  it("runs depth-first search and detects directed cycles", () => {
    const acyclic = depthFirstSearch(graph, "a");
    expect(acyclic.ok).toBe(true);
    if (acyclic.ok) {
      expect(acyclic.value.preorder).toEqual(["a", "b", "c"]);
      expect(acyclic.value.postorder).toEqual(["b", "c", "a"]);
      expect(acyclic.value.hasCycle).toBe(false);
    }

    const cyclic = depthFirstSearch(
      {
        directed: true,
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        edges: [
          { source: "a", target: "b" },
          { source: "b", target: "c" },
          { source: "c", target: "a" },
        ],
      },
      "a",
    );
    expect(cyclic.ok).toBe(true);
    if (cyclic.ok) expect(cyclic.value.hasCycle).toBe(true);
  });

  it("computes weighted shortest paths with unreachable nodes preserved", () => {
    const result = dijkstraShortestPath(graph, "a", "b");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.path).toEqual(["a", "b"]);
      expect(result.value.distance).toBe(2);
      expect(result.value.distances).toEqual([
        { id: "a", distance: 0 },
        { id: "b", distance: 2 },
        { id: "c", distance: 1 },
        { id: "d", distance: Number.POSITIVE_INFINITY },
      ]);
    }
  });

  it("prefers lower total path weight over fewer edges", () => {
    const result = dijkstraShortestPath(
      {
        directed: true,
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        edges: [
          { source: "a", target: "b", weight: 10 },
          { source: "a", target: "c", weight: 2 },
          { source: "c", target: "b", weight: 3 },
        ],
      },
      "a",
      "b",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.path).toEqual(["a", "c", "b"]);
      expect(result.value.distance).toBe(5);
    }
  });

  it("topologically sorts DAGs and rejects cycles", () => {
    const sorted = topologicalSort(graph);
    expect(sorted.ok).toBe(true);
    if (sorted.ok) {
      expect(sorted.value.order.indexOf("a")).toBeLessThan(sorted.value.order.indexOf("b"));
      expect(sorted.value.order.indexOf("a")).toBeLessThan(sorted.value.order.indexOf("c"));
    }

    const cyclic = topologicalSort({
      directed: true,
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    });
    expect(cyclic.ok).toBe(false);
    if (!cyclic.ok) expect(cyclic.error.code).toBe("precondition-violated");
  });

  it("computes weak connected components in deterministic node order", () => {
    const result = connectedComponents({
      directed: true,
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      edges: [{ source: "b", target: "a" }, { source: "c", target: "d" }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.components).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("computes a minimum spanning tree with stable tie-breaking", () => {
    const sourceEdges = [
      { source: "a", target: "b", weight: 1 },
      { source: "b", target: "c", weight: 1 },
      { source: "a", target: "c", weight: 2 },
      { source: "c", target: "d", weight: 3 },
    ] as const;
    const result = minimumSpanningTree({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      edges: sourceEdges,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalWeight).toBe(5);
      expect(result.value.edges).toEqual([
        { source: "a", target: "b", weight: 1 },
        { source: "b", target: "c", weight: 1 },
        { source: "c", target: "d", weight: 3 },
      ]);
    }
    expect(sourceEdges.map((edge) => edge.weight)).toEqual([1, 1, 2, 3]);
  });

  it("returns KernelResult errors for invalid graph preconditions", () => {
    const duplicate = neighbors(
      {
        nodes: [{ id: "a" }, { id: "a" }],
        edges: [],
      },
      "a",
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("precondition-violated");

    const missing = neighbors({ nodes: [{ id: "a" }], edges: [] }, "b");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe("precondition-violated");

    const negative = dijkstraShortestPath(
      {
        directed: true,
        nodes: [{ id: "a" }, { id: "b" }],
        edges: [{ source: "a", target: "b", weight: -1 }],
      },
      "a",
      "b",
    );
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.error.code).toBe("precondition-violated");
  });

  it("property: BFS distances differ by at most one across tree edges", () => {
    for (let size = 2; size <= 24; size += 1) {
      const nodes = Array.from({ length: size }, (_, i) => ({ id: `n${i}` }));
      const edges = nodes.slice(1).map((node, i) => ({
        source: `n${Math.floor(i / 2)}`,
        target: node.id,
      }));
      const result = breadthFirstSearch({ nodes, edges }, "n0");
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const distanceById = new Map(result.value.distances.map((entry) => [entry.id, entry.distance]));
      for (const edge of edges) {
        const sourceDistance = distanceById.get(edge.source);
        const targetDistance = distanceById.get(edge.target);
        expect(sourceDistance).not.toBeUndefined();
        expect(targetDistance).not.toBeUndefined();
        if (sourceDistance !== undefined && targetDistance !== undefined) {
          expect(Math.abs(sourceDistance - targetDistance)).toBe(1);
        }
      }
    }
  });

  it("property: MST of a connected graph with n nodes has n - 1 edges", () => {
    for (let size = 1; size <= 20; size += 1) {
      const nodes = Array.from({ length: size }, (_, i) => ({ id: `n${i}` }));
      const edges = nodes.slice(1).map((node, i) => ({
        source: `n${i}`,
        target: node.id,
        weight: i + 1,
      }));
      const result = minimumSpanningTree({ nodes, edges });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.edges).toHaveLength(Math.max(0, size - 1));
      }
    }
  });
});
