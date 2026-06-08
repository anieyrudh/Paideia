import { describe, expect, it } from "vitest";
import { buildDynamicProgrammingStateRecursionModel } from "./dynamic-programming-state-recursion.js";

describe("dynamic programming state recursion model", () => {
  it("computes the stored recurrence value and table rows", () => {
    const model = buildDynamicProgrammingStateRecursionModel({ targetStep: 5, strategy: "memoized" });

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.result).toBe(8);
    expect(model.value.rows).toHaveLength(6);
    expect(model.value.substitution).toBe("ways(5) = ways(4) + ways(3) = 5 + 3 = 8");
  });

  it("shows that memoisation preserves the value while reducing repeated calls", () => {
    const model = buildDynamicProgrammingStateRecursionModel({ targetStep: 7, strategy: "plain" });

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.result).toBe(21);
    expect(model.value.plainCallCount).toBeGreaterThan(model.value.memoizedEvaluations);
    expect(model.value.avoidedCalls).toBe(model.value.plainCallCount - model.value.memoizedEvaluations);
    expect(model.value.memoHits).toBeGreaterThan(0);
  });

  it("lays out the recurrence graph with one node per state", () => {
    const model = buildDynamicProgrammingStateRecursionModel({ targetStep: 6, strategy: "memoized" });

    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(model.value.layout.nodes).toHaveLength(7);
    expect(model.value.layout.links).toHaveLength(10);
    expect(model.value.traceEntries.some((entry) => entry.kind === "reuse")).toBe(true);
  });
});
