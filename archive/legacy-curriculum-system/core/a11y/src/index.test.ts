import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  accessibleName,
  assertA11yBudget,
  domIdToken,
  impactRank,
  summarizeA11yViolations,
  violationsAtOrAbove,
  type A11yImpact,
  type A11yViolation,
} from "./index.js";

const violations: readonly A11yViolation[] = [
  { id: "color-contrast", impact: "serious", help: "Contrast must be sufficient" },
  { id: "image-alt", impact: "critical", help: "Images need alternatives" },
  { id: "landmark-one-main", impact: "moderate" },
  { id: "label", impact: null },
];

describe("impactRank", () => {
  it("orders impacts from minor to critical", () => {
    expect(impactRank("minor")).toBeLessThan(impactRank("moderate"));
    expect(impactRank("moderate")).toBeLessThan(impactRank("serious"));
    expect(impactRank("serious")).toBeLessThan(impactRank("critical"));
  });

  it("is monotonic for the declared impact order", () => {
    const impacts: readonly A11yImpact[] = ["minor", "moderate", "serious", "critical"];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: impacts.length - 1 }),
        fc.integer({ min: 0, max: impacts.length - 1 }),
        (left, right) => {
          const leftImpact = impacts[left] ?? "minor";
          const rightImpact = impacts[right] ?? "minor";
          expect(impactRank(leftImpact) <= impactRank(rightImpact)).toBe(left <= right);
        },
      ),
    );
  });
});

describe("accessibleName", () => {
  it("collapses whitespace and brands non-empty names", () => {
    expect(accessibleName("  Step   response chart  ")).toEqual({
      ok: true,
      value: "Step response chart",
    });
  });

  it("rejects empty names", () => {
    expect(accessibleName("  \n\t ").ok).toBe(false);
  });
});

describe("domIdToken", () => {
  it("brands non-empty tokens without whitespace", () => {
    expect(domIdToken("chart-title").ok).toBe(true);
  });

  it("rejects blank, padded, or whitespace-containing ids", () => {
    expect(domIdToken("").ok).toBe(false);
    expect(domIdToken(" title").ok).toBe(false);
    expect(domIdToken("chart title").ok).toBe(false);
  });
});

describe("violation summaries", () => {
  it("filters violations at or above the requested impact", () => {
    const seriousOrWorse = violationsAtOrAbove(violations, "serious");
    const criticalOnly = violationsAtOrAbove(violations, "critical");

    expect(seriousOrWorse.ok).toBe(true);
    expect(criticalOnly.ok).toBe(true);
    if (!seriousOrWorse.ok || !criticalOnly.ok) return;

    expect(seriousOrWorse.value.map((violation) => violation.id))
      .toEqual(["color-contrast", "image-alt"]);
    expect(criticalOnly.value.map((violation) => violation.id))
      .toEqual(["image-alt"]);
  });

  it("rejects malformed impacts while filtering", () => {
    const result = violationsAtOrAbove([
      { id: "unknown-impact", impact: "blocker" as A11yImpact },
    ], "serious");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });

  it("summarizes counts and defaults blocking to serious or critical", () => {
    const result = summarizeA11yViolations(violations);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(4);
    expect(result.value.counts).toEqual({
      minor: 1,
      moderate: 1,
      serious: 1,
      critical: 1,
    });
    expect(result.value.highestImpact).toBe("critical");
    expect(
      result.value.blockingViolations.map((violation: A11yViolation) => violation.id),
    )
      .toEqual(["color-contrast", "image-alt"]);
  });

  it("rejects malformed violations instead of silently ignoring them", () => {
    expect(summarizeA11yViolations([{ id: "", impact: "critical" }]).ok).toBe(false);
    expect(
      summarizeA11yViolations([
        { id: "unknown-impact", impact: "blocker" as A11yImpact },
      ]).ok,
    ).toBe(false);
  });

  it("does not mutate caller-owned violation arrays", () => {
    const mutable = [...violations];
    const before = JSON.stringify(mutable);
    expect(summarizeA11yViolations(mutable).ok).toBe(true);
    expect(JSON.stringify(mutable)).toBe(before);
  });
});

describe("assertA11yBudget", () => {
  it("passes when every configured impact count is within budget", () => {
    const result = assertA11yBudget(violations, {
      minor: 1,
      moderate: 1,
      serious: 1,
      critical: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blockingViolations).toEqual([]);
  });

  it("only treats explicitly budgeted exceeded impacts as blocking", () => {
    const result = assertA11yBudget(violations, { critical: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blockingViolations).toEqual([]);
  });

  it("fails when an impact exceeds its budget", () => {
    const result = assertA11yBudget(violations, { critical: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("precondition-violated");
    expect(result.error.cause).toMatchObject({
      blockingViolations: [{ id: "image-alt" }],
    });
  });

  it("rejects invalid budget values", () => {
    expect(assertA11yBudget(violations, { serious: -1 }).ok).toBe(false);
    expect(assertA11yBudget(violations, { serious: 0.5 }).ok).toBe(false);
  });
});
