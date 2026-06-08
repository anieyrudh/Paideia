import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cycleEvidence } from "./cell-cycle-and-mitosis-meiosis.js";

type DivisionMode = "mitosis" | "meiosis";

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
      expect(daughter.ploidy).toBe(2);
      expect(daughter.dnaContent).toBe(1);
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
      expect(daughter.ploidy).toBe(1);
      expect(daughter.dnaContent).toBe(1);
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

  it("preserves phase and daughter-cell invariants across checkpoint states", () => {
    try {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.constantFrom<DivisionMode>("mitosis", "meiosis"),
          (dnaDamaged, replicationComplete, chromosomesAligned, nutrientsSufficient, divisionMode) => {
            const result = cycleEvidence({
              dnaDamaged,
              replicationComplete,
              chromosomesAligned,
              nutrientsSufficient,
              divisionMode,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(["G0", "G1", "S", "G2", "M"]).toContain(result.value.finalCell.phase);
            expect(result.value.daughters).toHaveLength(
              result.value.finalCell.phase === "M" &&
                result.value.finalCell.dnaContent === 2 &&
                chromosomesAligned
                ? divisionMode === "mitosis"
                  ? 2
                  : 4
                : 0,
            );
            for (const daughter of result.value.daughters) {
              expect(daughter.dnaContent).toBe(1);
              expect(daughter.ploidy).toBe(divisionMode === "mitosis" ? 2 : 1);
            }
          },
        ),
        { seed: 123456, numRuns: 200 },
      );
    } catch (error) {
      console.error("cycleEvidence property failed with fast-check seed 123456", error);
      throw error;
    }
  });
});
