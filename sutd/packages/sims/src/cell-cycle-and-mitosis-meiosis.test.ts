import { describe, expect, it } from "vitest";

import { cycleEvidence } from "./cell-cycle-and-mitosis-meiosis.js";

describe("cycleEvidence", () => {
  it("produces two diploid daughters from a happy mitosis cycle", () => {
    const result = cycleEvidence({
      dnaDamaged: false,
      replicationComplete: true,
      chromosomesAligned: true,
      nutrientsSufficient: true,
      divisionMode: "mitosis",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.finalCell.phase).toBe("M");
    expect(result.value.daughters).toHaveLength(2);
    for (const daughter of result.value.daughters) {
      expect(daughter.ploidy as unknown as number).toBe(2);
      expect(daughter.dnaContent as unknown as number).toBe(1);
    }
  });

  it("produces four haploid gametes from a happy meiosis cycle", () => {
    const result = cycleEvidence({
      dnaDamaged: false,
      replicationComplete: true,
      chromosomesAligned: true,
      nutrientsSufficient: true,
      divisionMode: "meiosis",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.daughters).toHaveLength(4);
    for (const daughter of result.value.daughters) {
      expect(daughter.ploidy as unknown as number).toBe(1);
      expect(daughter.dnaContent as unknown as number).toBe(1);
    }
  });

  it("DNA damaged pins the cell at G1 with a failed G1/S checkpoint", () => {
    const result = cycleEvidence({
      dnaDamaged: true,
      replicationComplete: true,
      chromosomesAligned: true,
      nutrientsSufficient: true,
      divisionMode: "mitosis",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.finalCell.phase).toBe("G1");
    expect(result.value.daughters).toHaveLength(0);
    const g1s = result.value.trajectory.find((t) => t.checkpoint?.name === "G1/S");
    expect(g1s).toBeDefined();
    expect(g1s?.checkpoint?.satisfied).toBe(false);
  });

  it("nutrient-starved cell at G0 returns to G0 without dividing", () => {
    const result = cycleEvidence({
      dnaDamaged: false,
      replicationComplete: true,
      chromosomesAligned: true,
      nutrientsSufficient: false,
      divisionMode: "mitosis",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.daughters).toHaveLength(0);
    // The cell should not have reached M.
    expect(result.value.finalCell.phase === "G1" || result.value.finalCell.phase === "G0").toBe(true);
  });

  it("rejects an unknown divisionMode", () => {
    const result = cycleEvidence({
      dnaDamaged: false,
      replicationComplete: true,
      chromosomesAligned: true,
      nutrientsSufficient: true,
      divisionMode: "binary-fission" as unknown as "mitosis",
    });
    expect(result.ok).toBe(false);
  });
});
