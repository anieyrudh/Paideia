import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  codon,
  complementDna,
  dna,
  dnaAlphabet,
  gcContent,
  hammingDistance,
  protein,
  proteinAlphabet,
  reverseComplementDna,
  rna,
  rnaAlphabet,
  standardCodonTable,
  transcribe,
  translate,
  type DnaSequence,
  type RnaSequence,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const arbitraryDna = fc
  .array(fc.constantFrom("A", "C", "G", "T"), { minLength: 1, maxLength: 96 })
  .map((letters) => letters.join(""));

const complementSeed = 0x5eed101;
const reverseComplementSeed = 0x5eed102;

describe("alphabets", () => {
  it("dnaAlphabet contains exactly ACGT", () => {
    expect([...dnaAlphabet].sort()).toEqual(["A", "C", "G", "T"]);
  });

  it("rnaAlphabet contains exactly ACGU", () => {
    expect([...rnaAlphabet].sort()).toEqual(["A", "C", "G", "U"]);
  });

  it("proteinAlphabet contains the 20 amino acids plus stop", () => {
    expect(proteinAlphabet.size).toBe(21);
    expect(proteinAlphabet.has("*")).toBe(true);
    expect(proteinAlphabet.has("M")).toBe(true);
    expect(proteinAlphabet.has("B")).toBe(false);
  });

  it("public alphabets are frozen readonly views, not mutable Sets", () => {
    expect(Object.isFrozen(dnaAlphabet)).toBe(true);
    expect("add" in dnaAlphabet).toBe(false);
    expect("delete" in dnaAlphabet).toBe(false);

    const attemptedMutation = dnaAlphabet as unknown as { add?: (value: string) => unknown };
    attemptedMutation.add?.("U");

    expect(dnaAlphabet.has("U")).toBe(false);
    expect(dna("U").ok).toBe(false);
  });
});

describe("standardCodonTable", () => {
  it("has exactly 64 codons", () => {
    expect(Object.keys(standardCodonTable)).toHaveLength(64);
  });

  it("AUG codes for methionine", () => {
    expect(standardCodonTable.AUG).toBe("M");
  });

  it("UAA, UAG, UGA are stop codons", () => {
    expect(standardCodonTable.UAA).toBe("*");
    expect(standardCodonTable.UAG).toBe("*");
    expect(standardCodonTable.UGA).toBe("*");
  });

  it("every amino acid in the table is in the protein alphabet", () => {
    for (const amino of Object.values(standardCodonTable)) {
      expect(proteinAlphabet.has(amino)).toBe(true);
    }
  });

  it("is frozen against mutation", () => {
    expect(Object.isFrozen(standardCodonTable)).toBe(true);
  });
});

describe("dna / rna / protein constructors", () => {
  it("dna uppercases mixed case and brands the result", () => {
    const result = dna("AcGt");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("ACGT");
  });

  it("dna rejects empty string with precondition-violated", () => {
    const result = dna("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("dna rejects U with out-of-domain", () => {
    const result = dna("ACGU");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rna rejects T with out-of-domain", () => {
    const result = rna("ACGT");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("protein accepts the 20 amino acids plus stop", () => {
    const result = protein("ACDEFGHIKLMNPQRSTVWY*");
    expect(result.ok).toBe(true);
  });

  it("protein rejects B (ambiguity code)", () => {
    const result = protein("MB");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects non-string inputs", () => {
    const result = dna(null as unknown as string);
    expect(result.ok).toBe(false);
  });
});

describe("codon", () => {
  it("accepts a length-3 RNA codon", () => {
    const result = codon("AUG");
    expect(result.ok).toBe(true);
  });

  it("rejects a length-4 codon", () => {
    const result = codon("AUGG");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects a codon with T", () => {
    const result = codon("ATG");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});

describe("complement and reverse complement", () => {
  it("complementDna pairs A<->T and C<->G", () => {
    const seq = unwrap(dna("ACGT"));
    expect(unwrap(complementDna(seq))).toBe("TGCA");
  });

  it("complementDna is involutive (property test)", () => {
    try {
      fc.assert(
        fc.property(arbitraryDna, (sample) => {
          const seq = unwrap(dna(sample));
          const once = unwrap(complementDna(seq));
          const onceBranded = unwrap(dna(once));
          const twice = unwrap(complementDna(onceBranded));
          expect(twice).toBe(sample);
        }),
        { seed: complementSeed, numRuns: 200 },
      );
    } catch (error) {
      console.error(`fast-check seed: ${complementSeed}`);
      throw error;
    }
  });

  it("reverseComplementDna reverses then complements", () => {
    const seq = unwrap(dna("AAATTT"));
    expect(unwrap(reverseComplementDna(seq))).toBe("AAATTT");
  });

  it("reverseComplementDna is involutive (property test)", () => {
    try {
      fc.assert(
        fc.property(arbitraryDna, (sample) => {
          const seq = unwrap(dna(sample));
          const once = unwrap(reverseComplementDna(seq));
          const onceBranded = unwrap(dna(once));
          const twice = unwrap(reverseComplementDna(onceBranded));
          expect(twice).toBe(sample);
        }),
        { seed: reverseComplementSeed, numRuns: 200 },
      );
    } catch (error) {
      console.error(`fast-check seed: ${reverseComplementSeed}`);
      throw error;
    }
  });
});

describe("transcribe", () => {
  it("replaces T with U and preserves length", () => {
    const seq = unwrap(dna("ATGCAT"));
    const rnaSeq = unwrap(transcribe(seq));
    expect(rnaSeq).toBe("AUGCAU");
    expect(rnaSeq).toHaveLength(seq.length);
  });

  it("preserves a U-less sequence unchanged", () => {
    const seq = unwrap(dna("ACGACG"));
    expect(unwrap(transcribe(seq))).toBe("ACGACG");
  });

  it("rejects forged DNA brands with non-DNA letters", () => {
    const result = transcribe("ACGU" as DnaSequence);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});

describe("translate", () => {
  it("translates AUGUUU as MF", () => {
    const seq = unwrap(rna("AUGUUU"));
    expect(unwrap(translate(seq))).toBe("MF");
  });

  it("emits * for stop codons", () => {
    const seq = unwrap(rna("AUGUAA"));
    expect(unwrap(translate(seq))).toBe("M*");
  });

  it("respects the reading frame", () => {
    const seq = unwrap(rna("GAUGUUU"));
    expect(unwrap(translate(seq, 1))).toBe("MF");
  });

  it("ignores trailing one or two bases", () => {
    const seq = unwrap(rna("AUGU"));
    expect(unwrap(translate(seq))).toBe("M");
  });

  it("rejects an invalid frame at compile time but also at runtime", () => {
    const seq = unwrap(rna("AUGUUU"));
    const result = translate(seq, 3 as unknown as 0);
    expect(result.ok).toBe(false);
  });

  it("rejects too-short input with precondition-violated", () => {
    const seq = unwrap(rna("AU"));
    const result = translate(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});

describe("gcContent", () => {
  it("counts G and C as a fraction in [0, 1]", () => {
    const seq = unwrap(dna("GCGC"));
    expect(approxEqual(unwrap(gcContent(seq)), 1)).toBe(true);
    const seq2 = unwrap(dna("AAAA"));
    expect(approxEqual(unwrap(gcContent(seq2)), 0)).toBe(true);
    const seq3 = unwrap(dna("AAGC"));
    expect(approxEqual(unwrap(gcContent(seq3)), 0.5)).toBe(true);
  });

  it("works on RNA as well as DNA", () => {
    const seq = unwrap(rna("GCGC"));
    expect(approxEqual(unwrap(gcContent(seq)), 1)).toBe(true);
  });

  it("rejects forged sequence brands with non-nucleotide letters", () => {
    const dnaResult = gcContent("AX" as DnaSequence);
    expect(dnaResult.ok).toBe(false);
    if (!dnaResult.ok) expect(dnaResult.error.code).toBe("precondition-violated");

    const rnaResult = gcContent("AZ" as RnaSequence);
    expect(rnaResult.ok).toBe(false);
    if (!rnaResult.ok) expect(rnaResult.error.code).toBe("precondition-violated");
  });
});

describe("hammingDistance", () => {
  it("counts mismatches at matching positions", () => {
    expect(unwrap(hammingDistance("ACGT", "ACGA"))).toBe(1);
    expect(unwrap(hammingDistance("AAAA", "TTTT"))).toBe(4);
    expect(unwrap(hammingDistance("ACGT", "ACGT"))).toBe(0);
  });

  it("rejects unequal-length inputs", () => {
    const result = hammingDistance("AC", "ACG");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects non-string inputs", () => {
    const result = hammingDistance("AC" as string, null as unknown as string);
    expect(result.ok).toBe(false);
  });
});

describe("transcribe + translate end-to-end", () => {
  it("M F * round-trips from DNA ATGTTCTAA", () => {
    const dnaSeq = unwrap(dna("ATGTTCTAA"));
    const mrna = unwrap(transcribe(dnaSeq));
    expect(mrna).toBe("AUGUUCUAA");
    const proteinSeq = unwrap(translate(mrna));
    expect(proteinSeq).toBe("MF*");
  });
});
