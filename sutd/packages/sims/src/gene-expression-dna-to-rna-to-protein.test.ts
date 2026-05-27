import { describe, expect, it } from "vitest";

import { geneExpressionEvidence } from "./gene-expression-dna-to-rna-to-protein.js";

describe("geneExpressionEvidence", () => {
  it("transcribes and translates the methionine-start preset to M E L F *", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: 1,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dnaSequence).toBe("ATGGAACTGTTCTAA");
    expect(result.value.rnaSequence).toBe("AUGGAACUGUUCUAA");
    expect(result.value.proteinSequence).toBe("MELF*");
  });

  it("a point mutation changes the last amino acid (mutation-elf-to-ely preset)", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "mutation-elf-to-ely",
      inducerConcentration: 1,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.proteinSequence).toBe("MELFY");
  });

  it("regulator at threshold gives R = 0.5", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: 1,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.regulationFraction).toBeCloseTo(0.5, 6);
  });

  it("raising inducer well above threshold approaches the saturating plateau", () => {
    const low = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: 0.2,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    const high = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: 10,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(low.ok && high.ok).toBe(true);
    if (!low.ok || !high.ok) return;
    expect(high.value.steadyStateProtein).toBeGreaterThan(low.value.steadyStateProtein);
    expect(high.value.regulationFraction).toBeGreaterThan(0.99);
  });

  it("zero inducer gives R = 0 and yields the basal steady state", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: 0,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.regulationFraction).toBe(0);
    expect(result.value.transcriptionRatePerSecond).toBeCloseTo(0.01, 6);
  });

  it("rejects unknown preset", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "made-up" as unknown as "methionine-start",
      inducerConcentration: 1,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects NaN inducer concentration", () => {
    const result = geneExpressionEvidence({
      dnaPresetId: "methionine-start",
      inducerConcentration: Number.NaN,
      hillCoefficient: 2,
      hillThreshold: 1,
    });
    expect(result.ok).toBe(false);
  });
});
