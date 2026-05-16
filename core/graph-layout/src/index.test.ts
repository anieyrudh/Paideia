import { describe, expect, it } from "vitest";
import { forceDirected2D, forceDirected3D, treeLayout, type Graph } from "./index.js";

const graph: Graph = {
  nodes: [{ id: "a" }, { id: "b", weight: 2 }, { id: "c" }],
  links: [
    { source: "a", target: "b" },
    { source: "b", target: "c", strength: 2 },
  ],
};

describe("@paideia/graph-layout", () => {
  it("returns deterministic 2D layouts for the same graph and seed", () => {
    const first = forceDirected2D(graph, { seed: 42, iterations: 20 });
    const second = forceDirected2D(graph, { seed: 42, iterations: 20 });
    expect(first).toEqual(second);
  });

  it("does not mutate the input graph", () => {
    const frozen: Graph = {
      nodes: Object.freeze(graph.nodes.map((node) => Object.freeze({ ...node }))),
      links: Object.freeze(graph.links.map((link) => Object.freeze({ ...link }))),
    };
    const before = JSON.stringify(frozen);
    expect(forceDirected3D(frozen, { seed: 7, iterations: 8 }).ok).toBe(true);
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("preserves duplicate links instead of deduping edge structure", () => {
    const withParallelLinks: Graph = {
      nodes: [{ id: "a" }, { id: "b" }],
      links: [
        { source: "a", target: "b" },
        { source: "a", target: "b" },
      ],
    };
    const result = forceDirected2D(withParallelLinks, { iterations: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.links).toHaveLength(2);
  });

  it("rejects links that reference missing nodes", () => {
    const result = forceDirected2D({
      nodes: [{ id: "a" }],
      links: [{ source: "a", target: "missing" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("lays trees out deterministically without swallowing children", () => {
    const result = treeLayout({
      id: "root",
      children: [
        { id: "left" },
        { id: "right", children: [{ id: "leaf" }] },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.map((node) => node.id)).toEqual([
        "root",
        "left",
        "right",
        "leaf",
      ]);
      expect(result.value.links).toEqual([
        { source: "root", target: "left" },
        { source: "root", target: "right" },
        { source: "right", target: "leaf" },
      ]);
    }
  });
});
