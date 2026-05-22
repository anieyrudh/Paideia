// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  buildGraphAlgorithmExplorerModel,
  defaultGraphAlgorithmExplorerState,
} from "./graph-algorithm-explorer.js";

describe("graph-algorithm-explorer sim model", () => {
  it("uses graph kernels to show BFS and Dijkstra optimize different objectives", () => {
    const result = buildGraphAlgorithmExplorerModel(defaultGraphAlgorithmExplorerState);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bfsPath).toEqual(["S", "A", "T"]);
    expect(result.value.bfsHopCount).toBe(2);
    expect(result.value.bfsPathCost).toBe(11);
    expect(result.value.dijkstraPath).toEqual(["S", "A", "C", "T"]);
    expect(result.value.dijkstraDistance).toBe(5);
  });

  it("uses algorithm-trace for deterministic DFS evidence", () => {
    const result = buildGraphAlgorithmExplorerModel({
      algorithmMode: "dfs",
      graphScenario: "tie-order",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.traversalTrace.meta.algorithm).toBe("dfs");
    expect(result.value.traversalTrace.steps.some((step) => step.kind === "visit")).toBe(true);
    expect(result.value.traversalOrder[0]).toBe("S");
  });

  it("uses graph-layout to produce deterministic node coordinates", () => {
    const first = buildGraphAlgorithmExplorerModel({
      algorithmMode: "dijkstra",
      graphScenario: "weighted-detour",
    });
    const second = buildGraphAlgorithmExplorerModel({
      algorithmMode: "dijkstra",
      graphScenario: "weighted-detour",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.layout.nodes).toEqual(second.value.layout.nodes);
    expect(first.value.layout.links).toEqual(second.value.layout.links);
  });
});
