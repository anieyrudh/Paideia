// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { structuralLoadPathModel } from "./structural-load-path-diagram.js";

describe("structural load path diagram sim model", () => {
  it("increases brace utilization when lateral load increases", () => {
    const low = structuralLoadPathModel({
      lateralLoadKn: 18,
      roofLoadKn: 90,
      bayWidthM: 6,
      storeyHeightM: 4,
      braceSize: "standard",
      loadDirection: "left-to-right",
    });
    const high = structuralLoadPathModel({
      lateralLoadKn: 42,
      roofLoadKn: 90,
      bayWidthM: 6,
      storeyHeightM: 4,
      braceSize: "standard",
      loadDirection: "left-to-right",
    });

    expect(low.ok).toBe(true);
    expect(high.ok).toBe(true);
    if (!low.ok || !high.ok) return;

    expect(high.value.braceAxialKn).toBeGreaterThan(low.value.braceAxialKn);
    expect(high.value.braceUtilizationPercent).toBeGreaterThan(low.value.braceUtilizationPercent);
  });

  it("detects uplift when overturning exceeds half the roof load", () => {
    const evidence = structuralLoadPathModel({
      lateralLoadKn: 54,
      roofLoadKn: 48,
      bayWidthM: 4,
      storeyHeightM: 6,
      braceSize: "deep",
      loadDirection: "left-to-right",
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;

    expect(evidence.value.status).toBe("uplift-risk");
    expect(evidence.value.windwardReactionKn).toBeLessThan(0);
  });

  it("keeps a deterministic graph layout attached to the evidence", () => {
    const first = structuralLoadPathModel({
      lateralLoadKn: 24,
      roofLoadKn: 84,
      bayWidthM: 6,
      storeyHeightM: 4,
      braceSize: "standard",
      loadDirection: "right-to-left",
    });
    const second = structuralLoadPathModel({
      lateralLoadKn: 24,
      roofLoadKn: 84,
      bayWidthM: 6,
      storeyHeightM: 4,
      braceSize: "standard",
      loadDirection: "right-to-left",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.value.layout).toEqual(first.value.layout);
    expect(first.value.layout.links.some((link) => link.target === "diagonal brace")).toBe(true);
  });
});
