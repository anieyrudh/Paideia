import { describe, expect, it } from "vitest";

import { foldingEvidence } from "./protein-folding-and-function.js";

describe("foldingEvidence", () => {
  it("classifies poly-leucine as hydrophobic-dominant at window 9", () => {
    const result = foldingEvidence({
      presetId: "poly-leu",
      windowSize: 9,
      hydrophobicThreshold: 1.6,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dominantRegion).toBe("hydrophobic");
    expect(result.value.longestHydrophobicRun).toBeGreaterThan(0);
    expect(result.value.regionCounts.hydrophobic).toBeGreaterThan(
      result.value.regionCounts.hydrophilic,
    );
  });

  it("classifies poly-lysine as hydrophilic-dominant", () => {
    const result = foldingEvidence({
      presetId: "poly-lys",
      windowSize: 9,
      hydrophobicThreshold: 1.6,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dominantRegion).toBe("hydrophilic");
    expect(result.value.longestHydrophobicRun).toBe(0);
  });

  it("rejects unknown preset", () => {
    const result = foldingEvidence({
      presetId: "made-up" as unknown as "poly-leu",
      windowSize: 9,
      hydrophobicThreshold: 1.6,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects NaN threshold", () => {
    const result = foldingEvidence({
      presetId: "poly-leu",
      windowSize: 9,
      hydrophobicThreshold: Number.NaN,
    });
    expect(result.ok).toBe(false);
  });

  it("respects a higher hydrophobic threshold (fewer hydrophobic windows)", () => {
    const looser = foldingEvidence({
      presetId: "bacteriorhodopsin-fragment",
      windowSize: 9,
      hydrophobicThreshold: 1.0,
    });
    const stricter = foldingEvidence({
      presetId: "bacteriorhodopsin-fragment",
      windowSize: 9,
      hydrophobicThreshold: 2.8,
    });
    expect(looser.ok && stricter.ok).toBe(true);
    if (!looser.ok || !stricter.ok) return;
    expect(stricter.value.regionCounts.hydrophobic).toBeLessThanOrEqual(
      looser.value.regionCounts.hydrophobic,
    );
  });
});
