import { describe, expect, it } from "vitest";
import { hasCycle, layoutTimeline, type BranchingTimelineNode } from "./layout.js";

describe("timeline layout", () => {
  it("places items proportionally to time without mutating inputs", () => {
    const events = [
      { id: "late", at: 1000, label: "Late" },
      { id: "early", at: 0, label: "Early" },
    ] as const;
    const result = layoutTimeline(events, [], { domain: { min: 0, max: 1000 }, width: 1040 });
    expect(result.ok).toBe(true);
    expect(events[0]?.id).toBe("late");
    if (result.ok) {
      const early = result.value.items.find((item) => item.id === "early");
      const late = result.value.items.find((item) => item.id === "late");
      expect(early?.x).toBeLessThan(late?.x ?? 0);
    }
  });

  it("rejects reverse spans", () => {
    const result = layoutTimeline([], [{ id: "bad", from: 10, to: 5, label: "Bad" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("detects cycles in branching timelines", () => {
    const nodes: readonly BranchingTimelineNode[] = [
      { id: "a", at: 0, label: "A", children: ["b"] },
      { id: "b", at: 1, label: "B", children: ["a"] },
    ];
    expect(
      hasCycle(nodes),
    ).toBe(true);
    const result = layoutTimeline(
      nodes,
      [],
      { branchNodes: nodes },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects branching timelines with missing child references", () => {
    const nodes = [{ id: "a", at: 0, label: "A", children: ["missing"] }] as const;
    const result = layoutTimeline(nodes, [], { branchNodes: nodes });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});
