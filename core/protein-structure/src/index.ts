import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/protein-structure — Deterministic protein-property primitives.
 *
 * Owns per-residue amino-acid properties (hydropathy on the Kyte-Doolittle
 * scale, charge class, polarity class, molecular weight) and the standard
 * windowed-hydropathy classifier. This is a property-lookup + windowed-mean
 * kernel; it is intentionally NOT a folding engine, NOT a secondary-structure
 * predictor, and NOT a 3D structure modeller.
 */

export type AminoAcidLetter = Brand<string, "AminoAcidLetter">;
export type Hydropathy = Brand<number, "Hydropathy_KyteDoolittle">;
export type MolecularWeight = Brand<number, "MolecularWeight_Da">;

export type ChargeClass = "positive" | "negative" | "neutral";
export type PolarityClass = "polar" | "nonpolar";
export type RegionLabel = "hydrophobic" | "hydrophilic" | "neutral";

export interface AminoAcidProperties {
  readonly letter: AminoAcidLetter;
  readonly threeLetter: string;
  readonly name: string;
  readonly hydropathy: Hydropathy;
  readonly molecularWeight: MolecularWeight;
  readonly charge: ChargeClass;
  readonly polarity: PolarityClass;
}

export interface HydropathyProfilePoint {
  readonly index: number;
  readonly centreLetter: AminoAcidLetter;
  readonly meanHydropathy: Hydropathy;
  readonly region: RegionLabel;
}

export interface HydropathyProfile {
  readonly windowSize: number;
  readonly points: ReadonlyArray<HydropathyProfilePoint>;
}

// ──────────────────────────────────────────────────────────────────────────
// Standard 20-amino-acid table. Values are scientific facts (Kyte & Doolittle
// 1982 for hydropathy; standard residue weights for molecular weight).
// ──────────────────────────────────────────────────────────────────────────

interface AminoAcidRow {
  readonly threeLetter: string;
  readonly name: string;
  readonly hydropathy: number;
  readonly molecularWeight: number; // residue weight (free MW - 18.02 Da)
  readonly charge: ChargeClass;
  readonly polarity: PolarityClass;
}

const TABLE: Readonly<Record<string, AminoAcidRow>> = Object.freeze({
  A: { threeLetter: "Ala", name: "Alanine",       hydropathy:  1.8, molecularWeight:  71.08, charge: "neutral",  polarity: "nonpolar" },
  R: { threeLetter: "Arg", name: "Arginine",      hydropathy: -4.5, molecularWeight: 156.19, charge: "positive", polarity: "polar"    },
  N: { threeLetter: "Asn", name: "Asparagine",    hydropathy: -3.5, molecularWeight: 114.10, charge: "neutral",  polarity: "polar"    },
  D: { threeLetter: "Asp", name: "Aspartate",     hydropathy: -3.5, molecularWeight: 115.09, charge: "negative", polarity: "polar"    },
  C: { threeLetter: "Cys", name: "Cysteine",      hydropathy:  2.5, molecularWeight: 103.15, charge: "neutral",  polarity: "polar"    },
  E: { threeLetter: "Glu", name: "Glutamate",     hydropathy: -3.5, molecularWeight: 129.12, charge: "negative", polarity: "polar"    },
  Q: { threeLetter: "Gln", name: "Glutamine",     hydropathy: -3.5, molecularWeight: 128.13, charge: "neutral",  polarity: "polar"    },
  G: { threeLetter: "Gly", name: "Glycine",       hydropathy: -0.4, molecularWeight:  57.05, charge: "neutral",  polarity: "nonpolar" },
  H: { threeLetter: "His", name: "Histidine",     hydropathy: -3.2, molecularWeight: 137.14, charge: "positive", polarity: "polar"    },
  I: { threeLetter: "Ile", name: "Isoleucine",    hydropathy:  4.5, molecularWeight: 113.16, charge: "neutral",  polarity: "nonpolar" },
  L: { threeLetter: "Leu", name: "Leucine",       hydropathy:  3.8, molecularWeight: 113.16, charge: "neutral",  polarity: "nonpolar" },
  K: { threeLetter: "Lys", name: "Lysine",        hydropathy: -3.9, molecularWeight: 128.17, charge: "positive", polarity: "polar"    },
  M: { threeLetter: "Met", name: "Methionine",    hydropathy:  1.9, molecularWeight: 131.19, charge: "neutral",  polarity: "nonpolar" },
  F: { threeLetter: "Phe", name: "Phenylalanine", hydropathy:  2.8, molecularWeight: 147.18, charge: "neutral",  polarity: "nonpolar" },
  P: { threeLetter: "Pro", name: "Proline",       hydropathy: -1.6, molecularWeight:  97.12, charge: "neutral",  polarity: "nonpolar" },
  S: { threeLetter: "Ser", name: "Serine",        hydropathy: -0.8, molecularWeight:  87.08, charge: "neutral",  polarity: "polar"    },
  T: { threeLetter: "Thr", name: "Threonine",     hydropathy: -0.7, molecularWeight: 101.10, charge: "neutral",  polarity: "polar"    },
  W: { threeLetter: "Trp", name: "Tryptophan",    hydropathy: -0.9, molecularWeight: 186.21, charge: "neutral",  polarity: "nonpolar" },
  Y: { threeLetter: "Tyr", name: "Tyrosine",      hydropathy: -1.3, molecularWeight: 163.18, charge: "neutral",  polarity: "polar"    },
  V: { threeLetter: "Val", name: "Valine",        hydropathy:  4.2, molecularWeight:  99.13, charge: "neutral",  polarity: "nonpolar" },
});

const VALID_LETTERS: ReadonlySet<string> = new Set(Object.keys(TABLE));

// ──────────────────────────────────────────────────────────────────────────
// Constructors
// ──────────────────────────────────────────────────────────────────────────

export const aminoAcidLetter = (
  input: string,
): KernelResult<AminoAcidLetter> => {
  if (typeof input !== "string") {
    return err("precondition-violated", "AminoAcidLetter must be a string.");
  }
  if (input.length !== 1) {
    return err(
      "precondition-violated",
      `AminoAcidLetter must be exactly one letter; got length ${input.length}.`,
    );
  }
  if (!VALID_LETTERS.has(input)) {
    return err(
      "out-of-domain",
      `AminoAcidLetter "${input}" is not one of the 20 standard amino acids (uppercase).`,
    );
  }
  return ok(input as AminoAcidLetter);
};

// ──────────────────────────────────────────────────────────────────────────
// Total lookups (branded inputs only)
// ──────────────────────────────────────────────────────────────────────────

const requireBranded = (letter: AminoAcidLetter): AminoAcidRow => {
  const key = letter as unknown as string;
  const row = TABLE[key];
  if (row === undefined) {
    throw new Error(
      `AminoAcidLetter brand violated at runtime: ${String(key)} not in standard alphabet.`,
    );
  }
  return row;
};

export const aminoAcidProperties = (
  letter: AminoAcidLetter,
): AminoAcidProperties => {
  const row = requireBranded(letter);
  return {
    letter,
    threeLetter: row.threeLetter,
    name: row.name,
    hydropathy: row.hydropathy as Hydropathy,
    molecularWeight: row.molecularWeight as MolecularWeight,
    charge: row.charge,
    polarity: row.polarity,
  };
};

export const kyteDoolittleHydropathy = (
  letter: AminoAcidLetter,
): Hydropathy => requireBranded(letter).hydropathy as Hydropathy;

export const chargeClass = (letter: AminoAcidLetter): ChargeClass =>
  requireBranded(letter).charge;

export const polarityClass = (letter: AminoAcidLetter): PolarityClass =>
  requireBranded(letter).polarity;

// ──────────────────────────────────────────────────────────────────────────
// Windowed hydropathy profile
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_HYDROPHOBIC_THRESHOLD = 1.6 as Hydropathy;
const DEFAULT_HYDROPHILIC_THRESHOLD = -0.5 as Hydropathy;

export interface HydropathyProfileOptions {
  readonly hydrophobicThreshold?: Hydropathy;
  readonly hydrophilicThreshold?: Hydropathy;
}

const validateThreshold = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return err(
      "precondition-violated",
      `${label} must be a finite number; got ${String(value)}.`,
    );
  }
  return ok(value);
};

const validateSequence = (
  sequence: string,
): KernelResult<ReadonlyArray<AminoAcidLetter>> => {
  if (typeof sequence !== "string") {
    return err("precondition-violated", "sequence must be a string.");
  }
  if (sequence.length === 0) {
    return err("precondition-violated", "sequence must not be empty.");
  }
  const letters: AminoAcidLetter[] = [];
  for (let index = 0; index < sequence.length; index += 1) {
    const letter = sequence.charAt(index);
    const branded = aminoAcidLetter(letter);
    if (!branded.ok) {
      return err(
        "out-of-domain",
        `sequence contains invalid amino-acid letter "${letter}" at position ${index}.`,
      );
    }
    letters.push(branded.value);
  }
  return ok(letters);
};

const classifyRegion = (
  meanHydropathy: number,
  hydrophobicThreshold: number,
  hydrophilicThreshold: number,
): RegionLabel => {
  if (meanHydropathy >= hydrophobicThreshold) return "hydrophobic";
  if (meanHydropathy <= hydrophilicThreshold) return "hydrophilic";
  return "neutral";
};

export const hydropathyProfile = (
  sequence: string,
  windowSize: number,
  options: HydropathyProfileOptions = {},
): KernelResult<HydropathyProfile> => {
  const letters = validateSequence(sequence);
  if (!letters.ok) return letters;
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    return err(
      "precondition-violated",
      `windowSize must be a positive integer; got ${String(windowSize)}.`,
    );
  }
  if (windowSize % 2 === 0) {
    return err(
      "precondition-violated",
      `windowSize must be odd (so the window has a single centre residue); got ${windowSize}.`,
    );
  }
  if (windowSize > letters.value.length) {
    return err(
      "out-of-domain",
      `windowSize ${windowSize} exceeds sequence length ${letters.value.length}.`,
    );
  }

  const hydrophobic =
    options.hydrophobicThreshold !== undefined
      ? options.hydrophobicThreshold
      : DEFAULT_HYDROPHOBIC_THRESHOLD;
  const hydrophilic =
    options.hydrophilicThreshold !== undefined
      ? options.hydrophilicThreshold
      : DEFAULT_HYDROPHILIC_THRESHOLD;
  const validatedHydrophobic = validateThreshold(
    hydrophobic as unknown as number,
    "hydrophobicThreshold",
  );
  if (!validatedHydrophobic.ok) return validatedHydrophobic;
  const validatedHydrophilic = validateThreshold(
    hydrophilic as unknown as number,
    "hydrophilicThreshold",
  );
  if (!validatedHydrophilic.ok) return validatedHydrophilic;
  if (validatedHydrophilic.value > validatedHydrophobic.value) {
    return err(
      "precondition-violated",
      `hydrophilicThreshold (${validatedHydrophilic.value}) must be <= hydrophobicThreshold (${validatedHydrophobic.value}).`,
    );
  }

  const half = (windowSize - 1) / 2;
  const points: HydropathyProfilePoint[] = [];
  for (let centre = half; centre + half < letters.value.length; centre += 1) {
    let sum = 0;
    for (let offset = -half; offset <= half; offset += 1) {
      const item = letters.value[centre + offset];
      if (item === undefined) {
        return err(
          "numerical-instability",
          `windowing internal error at centre=${centre}, offset=${offset}.`,
        );
      }
      sum += kyteDoolittleHydropathy(item) as unknown as number;
    }
    const mean = sum / windowSize;
    if (!Number.isFinite(mean)) {
      return err(
        "numerical-instability",
        `mean hydropathy at centre=${centre} produced a non-finite result.`,
      );
    }
    const centreLetter = letters.value[centre];
    if (centreLetter === undefined) {
      return err(
        "numerical-instability",
        `centre residue at position ${centre} is undefined.`,
      );
    }
    points.push({
      index: centre,
      centreLetter,
      meanHydropathy: mean as Hydropathy,
      region: classifyRegion(
        mean,
        validatedHydrophobic.value,
        validatedHydrophilic.value,
      ),
    });
  }
  return ok({ windowSize, points });
};
