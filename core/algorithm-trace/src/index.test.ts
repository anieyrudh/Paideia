import { describe, expect, it } from "vitest";
import { traceSearch, traceSort, traceTraversal, type Graph } from "./index.js";
import { replayTrace } from "./replay.js";

describe("@paideia/algorithm-trace sorting", () => {
  it.each(["bubble", "insertion", "selection", "merge", "quick", "heap"] as const)(
    "sorts with deterministic %s trace output",
    (algorithm) => {
      const input = Object.freeze([5, 1, 4, 2, 8]);
      const first = traceSort(input, algorithm);
      const second = traceSort(input, algorithm);
      expect(first).toEqual(second);
      expect(input).toEqual([5, 1, 4, 2, 8]);
      expect(first.ok).toBe(true);
      if (first.ok) {
        expect(first.value.initial).toEqual([5, 1, 4, 2, 8]);
        expect(first.value.final).toEqual([1, 2, 4, 5, 8]);
        expect(first.value.meta.swaps).toBe(
          first.value.steps.filter((step) => step.kind === "swap").length,
        );
      }
    },
  );

  it("keeps comparison counts aligned with compare steps", () => {
    const result = traceSort([3, 2, 1], "bubble");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.meta.comparisons).toBe(
        result.value.steps.filter((step) => step.kind === "compare").length,
      );
    }
  });

  it("rejects non-finite sort values and unsupported algorithms", () => {
    expect(traceSort([1, Number.NaN], "bubble").ok).toBe(false);
    expect(traceSort([1], "bogus" as Parameters<typeof traceSort>[1]).ok).toBe(false);
  });

  it("replays every sort trace to its declared final state", () => {
    for (const algorithm of ["bubble", "insertion", "selection", "merge", "quick", "heap"] as const) {
      const result = traceSort([5, 1, 4, 2, 8], algorithm);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(replayTrace(result.value, result.value.steps.length)).toEqual(result.value.final);
      }
    }
  });
});

describe("@paideia/algorithm-trace search", () => {
  it("rejects binary search over unsorted input", () => {
    const result = traceSearch([3, 1, 2], 2, "binary");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("traces binary search without mutating input", () => {
    const input = Object.freeze([1, 2, 3, 4, 5]);
    const result = traceSearch(input, 4, "binary");
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.steps.some((step) => step.note === "found")).toBe(true);
      expect(result.value.final).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("rejects non-finite search values and unsupported algorithms", () => {
    expect(traceSearch([1, Number.POSITIVE_INFINITY], 1, "linear").ok).toBe(false);
    expect(traceSearch([1], 1, "jump" as Parameters<typeof traceSearch>[2]).ok).toBe(false);
  });
});

describe("@paideia/algorithm-trace traversal", () => {
  const graph: Graph = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    links: [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
    ],
  };

  it("traces bfs in graph node-index space", () => {
    const result = traceTraversal(graph, "a", "bfs");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.initial).toEqual(["a", "b", "c", "d"]);
      expect(result.value.final).toEqual(["a", "b", "c", "d"]);
      expect(result.value.steps[0]).toEqual({ kind: "visit", at: [0], value: "a" });
    }
  });

  it("rejects missing traversal starts", () => {
    const result = traceTraversal(graph, "missing", "dfs");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects unsupported traversal algorithms", () => {
    const result = traceTraversal(graph, "a", "walk" as Parameters<typeof traceTraversal>[2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});
