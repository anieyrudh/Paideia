import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  aminoAcidLetter,
  aminoAcidProperties,
  chargeClass,
  hydropathyProfile,
  kyteDoolittleHydropathy,
  polarityClass,
  type AminoAcidLetter,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const letter = (s: string): AminoAcidLetter => unwrap(aminoAcidLetter(s));

const propertySeed = 0x9f01_dee;

describe("aminoAcidLetter constructor", () => {
  it("accepts every one of the 20 standard letters", () => {
    for (const ch of "ACDEFGHIKLMNPQRSTVWY") {
      expect(aminoAcidLetter(ch).ok).toBe(true);
    }
  });

  it("rejects the stop symbol", () => {
    const result = aminoAcidLetter("*");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects ambiguity codes B, Z, J, X, U, O", () => {
    for (const ch of "BZJXUO") {
      const result = aminoAcidLetter(ch);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("out-of-domain");
    }
  });

  it("rejects lowercase letters", () => {
    expect(aminoAcidLetter("a").ok).toBe(false);
  });

  it("rejects multi-character input", () => {
    const result = aminoAcidLetter("AC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects empty string and non-string input", () => {
    expect(aminoAcidLetter("").ok).toBe(false);
    expect(aminoAcidLetter(null as unknown as string).ok).toBe(false);
  });
});

describe("kyteDoolittleHydropathy", () => {
  it("returns isoleucine at +4.5 and arginine at -4.5", () => {
    expect(kyteDoolittleHydropathy(letter("I")) as number).toBeCloseTo(4.5, 6);
    expect(kyteDoolittleHydropathy(letter("R")) as number).toBeCloseTo(-4.5, 6);
  });

  it("the 20 values lie in [-4.5, +4.5]", () => {
    for (const ch of "ACDEFGHIKLMNPQRSTVWY") {
      const h = kyteDoolittleHydropathy(letter(ch)) as number;
      expect(h).toBeGreaterThanOrEqual(-4.5);
      expect(h).toBeLessThanOrEqual(4.5);
    }
  });
});

describe("chargeClass and polarityClass", () => {
  it("classifies acidic, basic, polar, nonpolar examples", () => {
    expect(chargeClass(letter("D"))).toBe("negative");
    expect(chargeClass(letter("E"))).toBe("negative");
    expect(chargeClass(letter("K"))).toBe("positive");
    expect(chargeClass(letter("R"))).toBe("positive");
    expect(chargeClass(letter("H"))).toBe("positive");
    expect(chargeClass(letter("A"))).toBe("neutral");
    expect(polarityClass(letter("L"))).toBe("nonpolar");
    expect(polarityClass(letter("S"))).toBe("polar");
  });
});

describe("aminoAcidProperties", () => {
  it("returns the canonical record for methionine", () => {
    const m = aminoAcidProperties(letter("M"));
    expect(m.threeLetter).toBe("Met");
    expect(m.name).toBe("Methionine");
    expect(m.polarity).toBe("nonpolar");
    expect(m.charge).toBe("neutral");
    expect(m.hydropathy as number).toBeCloseTo(1.9, 6);
  });

  it("every entry has a three-letter code of length 3", () => {
    for (const ch of "ACDEFGHIKLMNPQRSTVWY") {
      const p = aminoAcidProperties(letter(ch));
      expect(p.threeLetter).toHaveLength(3);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("residue molecular weight is between 57 and 187 Da", () => {
    for (const ch of "ACDEFGHIKLMNPQRSTVWY") {
      const p = aminoAcidProperties(letter(ch));
      expect(p.molecularWeight as number).toBeGreaterThan(57);
      expect(p.molecularWeight as number).toBeLessThan(187);
    }
  });
});

describe("hydropathyProfile", () => {
  it("computes a windowed mean over a known transmembrane-like stretch", () => {
    // poly-Ile is the most hydrophobic stretch you can construct; window of 5
    // should produce mean = +4.5 (Ile) and label "hydrophobic".
    const result = hydropathyProfile("IIIIIII", 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.points).toHaveLength(3);
      for (const p of result.value.points) {
        expect(p.meanHydropathy as number).toBeCloseTo(4.5, 6);
        expect(p.region).toBe("hydrophobic");
      }
    }
  });

  it("classifies a hydrophilic stretch correctly", () => {
    const result = hydropathyProfile("RKRKRKR", 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const p of result.value.points) {
        expect(p.region).toBe("hydrophilic");
      }
    }
  });

  it("falls into the neutral band when mixed", () => {
    // A=+1.8, G=-0.4: window mean lies between the default thresholds
    // (-0.5 and +1.6), so each point is classified neutral.
    const result = hydropathyProfile("AGAGAGA", 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const p of result.value.points) {
        expect(p.region).toBe("neutral");
      }
    }
  });

  it("rejects even windowSize", () => {
    const result = hydropathyProfile("AAAA", 4);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects windowSize larger than the sequence", () => {
    const result = hydropathyProfile("AAA", 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects sequences containing invalid letters", () => {
    const result = hydropathyProfile("AAB", 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects non-integer or non-positive windowSize", () => {
    expect(hydropathyProfile("AAA", 0).ok).toBe(false);
    expect(hydropathyProfile("AAA", -1).ok).toBe(false);
    expect(hydropathyProfile("AAA", 1.5).ok).toBe(false);
  });

  it("rejects empty sequence", () => {
    const result = hydropathyProfile("", 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects hydrophilicThreshold above hydrophobicThreshold", () => {
    const result = hydropathyProfile("AAAAAAA", 3, {
      hydrophilicThreshold: 2 as ReturnType<typeof kyteDoolittleHydropathy>,
      hydrophobicThreshold: 1 as ReturnType<typeof kyteDoolittleHydropathy>,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("custom thresholds change the region labels (property)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "AAAAAAA",
          "IIIIIIII",
          "LLLLLLLL",
          "DDDDDDDD",
          "RKRKRKRK",
        ),
        (seq) => {
          const wide = unwrap(
            hydropathyProfile(seq, 3, {
              hydrophilicThreshold: -10 as ReturnType<typeof kyteDoolittleHydropathy>,
              hydrophobicThreshold: 10 as ReturnType<typeof kyteDoolittleHydropathy>,
            }),
          );
          for (const p of wide.points) {
            expect(p.region).toBe("neutral");
          }
        },
      ),
      { seed: propertySeed, numRuns: 20 },
    );
  });

  it("emits N - W + 1 points for sequence length N and window W", () => {
    const result = unwrap(hydropathyProfile("ACDEFGHIK", 3));
    expect(result.points).toHaveLength(9 - 3 + 1);
    // First centre is at index (W-1)/2 = 1, last at N-1-(W-1)/2 = 7.
    expect(result.points[0]?.index).toBe(1);
    expect(result.points[result.points.length - 1]?.index).toBe(7);
  });

  it("centre means equal the explicit running average (property)", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[ACDEFGHIKLMNPQRSTVWY]{7,21}$/),
        fc.constantFrom(3, 5, 7),
        (seq, window) => {
          if (seq.length < window) return;
          const profile = unwrap(hydropathyProfile(seq, window));
          for (const point of profile.points) {
            let sum = 0;
            const half = (window - 1) / 2;
            for (let i = point.index - half; i <= point.index + half; i += 1) {
              sum += kyteDoolittleHydropathy(letter(seq.charAt(i))) as number;
            }
            const expected = sum / window;
            expect(
              approxEqual(point.meanHydropathy as number, expected, 1e-12),
            ).toBe(true);
          }
        },
      ),
      { seed: propertySeed, numRuns: 60 },
    );
  });
});
