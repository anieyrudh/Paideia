import { describe, expect, it } from "vitest";

import { polymerEvidence } from "./polymers-and-plastic-waste-management.js";

describe("polymerEvidence", () => {
  it("ranks polymers and computes recovery evidence for valid inputs", () => {
    const evidence = polymerEvidence({
      performanceGoal: "low-carbon-strength",
      collectionRatePercent: 55,
      reuseCycles: 5,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;
    expect(evidence.value.topThree).toHaveLength(3);
    expect(evidence.value.landfillFraction).toBeCloseTo(0.45);
    expect(evidence.value.avoidedItems).toBe(80);
  });

  it("returns a KernelResult error for invalid recovery inputs", () => {
    const evidence = polymerEvidence({
      performanceGoal: "low-carbon-strength",
      collectionRatePercent: Number.NaN,
      reuseCycles: 5,
    });

    expect(evidence.ok).toBe(false);
    if (evidence.ok) return;
    expect(evidence.error.code).toBe("out-of-domain");
  });
});
