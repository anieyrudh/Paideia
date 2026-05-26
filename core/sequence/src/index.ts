import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/sequence — Deterministic biological sequence primitives.
 *
 * Pure string math over the four canonical DNA / RNA alphabets and the 20
 * standard amino acids. Provides validated branded types, the NCBI standard
 * codon table (translation table 1), and the operations needed by
 * gene-expression, mutation, and transcription/translation containers.
 */

export type DnaSequence = Brand<string, "DnaSequence">;
export type RnaSequence = Brand<string, "RnaSequence">;
export type ProteinSequence = Brand<string, "ProteinSequence">;
export type Codon = Brand<string, "Codon">;
export type AminoAcid = Brand<string, "AminoAcid">;

const DNA_LETTERS = ["A", "C", "G", "T"] as const;
const RNA_LETTERS = ["A", "C", "G", "U"] as const;
const PROTEIN_LETTERS = [
  "A",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "Y",
  "*",
] as const;

const readonlyAlphabet = (values: readonly string[]): ReadonlySet<string> => {
  const backing = new Set<string>(values);
  const readonly: ReadonlySet<string> = Object.freeze({
    get size(): number {
      return backing.size;
    },
    has(value: string): boolean {
      return backing.has(value);
    },
    entries(): IterableIterator<[string, string]> {
      return backing.entries();
    },
    keys(): IterableIterator<string> {
      return backing.keys();
    },
    values(): IterableIterator<string> {
      return backing.values();
    },
    forEach(
      callbackfn: (value: string, value2: string, set: ReadonlySet<string>) => void,
      thisArg?: unknown,
    ): void {
      backing.forEach((value, value2) => {
        callbackfn.call(thisArg, value, value2, readonly);
      });
    },
    [Symbol.iterator](): IterableIterator<string> {
      return backing[Symbol.iterator]();
    },
    get [Symbol.toStringTag](): string {
      return "Set";
    },
  });

  return readonly;
};

const DNA_ALPHABET = new Set<string>(DNA_LETTERS);
const RNA_ALPHABET = new Set<string>(RNA_LETTERS);
const PROTEIN_ALPHABET = new Set<string>(PROTEIN_LETTERS);
const NUCLEOTIDE_ALPHABET = new Set<string>([...DNA_LETTERS, "U"]);

export const dnaAlphabet: ReadonlySet<string> = readonlyAlphabet(DNA_LETTERS);
export const rnaAlphabet: ReadonlySet<string> = readonlyAlphabet(RNA_LETTERS);
export const proteinAlphabet: ReadonlySet<string> = readonlyAlphabet(PROTEIN_LETTERS);

/**
 * NCBI standard genetic code (translation table 1). 64 RNA codons mapping to
 * one-letter amino acid symbols. Stop codons map to `*`.
 *
 * Source: https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi?mode=t#SG1
 * (public-domain reference table; the mapping itself is a biological fact, not
 * a copyrightable expression).
 */
export const standardCodonTable: Readonly<Record<string, string>> =
  Object.freeze({
    UUU: "F", UUC: "F", UUA: "L", UUG: "L",
    CUU: "L", CUC: "L", CUA: "L", CUG: "L",
    AUU: "I", AUC: "I", AUA: "I", AUG: "M",
    GUU: "V", GUC: "V", GUA: "V", GUG: "V",
    UCU: "S", UCC: "S", UCA: "S", UCG: "S",
    CCU: "P", CCC: "P", CCA: "P", CCG: "P",
    ACU: "T", ACC: "T", ACA: "T", ACG: "T",
    GCU: "A", GCC: "A", GCA: "A", GCG: "A",
    UAU: "Y", UAC: "Y", UAA: "*", UAG: "*",
    CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
    AAU: "N", AAC: "N", AAA: "K", AAG: "K",
    GAU: "D", GAC: "D", GAA: "E", GAG: "E",
    UGU: "C", UGC: "C", UGA: "*", UGG: "W",
    CGU: "R", CGC: "R", CGA: "R", CGG: "R",
    AGU: "S", AGC: "S", AGA: "R", AGG: "R",
    GGU: "G", GGC: "G", GGA: "G", GGG: "G",
  });

const validateAgainst = (
  input: string,
  alphabet: ReadonlySet<string>,
  label: string,
): KernelResult<string> => {
  if (typeof input !== "string") {
    return err("precondition-violated", `${label} must be a string.`);
  }
  if (input.length === 0) {
    return err("precondition-violated", `${label} must not be empty.`);
  }
  const upper = input.toUpperCase();
  for (let index = 0; index < upper.length; index += 1) {
    const letter = upper.charAt(index);
    if (!alphabet.has(letter)) {
      return err(
        "out-of-domain",
        `${label} contains invalid letter "${input.charAt(index)}" at position ${index}.`,
      );
    }
  }
  return ok(upper);
};

export const dna = (input: string): KernelResult<DnaSequence> => {
  const validated = validateAgainst(input, DNA_ALPHABET, "DNA sequence");
  return validated.ok ? ok(validated.value as DnaSequence) : validated;
};

export const rna = (input: string): KernelResult<RnaSequence> => {
  const validated = validateAgainst(input, RNA_ALPHABET, "RNA sequence");
  return validated.ok ? ok(validated.value as RnaSequence) : validated;
};

export const protein = (input: string): KernelResult<ProteinSequence> => {
  const validated = validateAgainst(input, PROTEIN_ALPHABET, "Protein sequence");
  return validated.ok ? ok(validated.value as ProteinSequence) : validated;
};

export const codon = (input: string): KernelResult<Codon> => {
  if (typeof input !== "string") {
    return err("precondition-violated", "Codon must be a string.");
  }
  if (input.length !== 3) {
    return err(
      "precondition-violated",
      `Codon must be exactly three RNA letters; got length ${input.length}.`,
    );
  }
  const validated = validateAgainst(input, RNA_ALPHABET, "Codon");
  return validated.ok ? ok(validated.value as Codon) : validated;
};

const DNA_COMPLEMENT: Readonly<Record<string, string>> = Object.freeze({
  A: "T",
  T: "A",
  C: "G",
  G: "C",
});

export const complementDna = (seq: DnaSequence): KernelResult<DnaSequence> => {
  let out = "";
  for (let index = 0; index < seq.length; index += 1) {
    const letter = seq.charAt(index);
    const pair = DNA_COMPLEMENT[letter];
    if (pair === undefined) {
      return err(
        "precondition-violated",
        `DNA sequence brand violated: unexpected letter "${letter}" at position ${index}.`,
      );
    }
    out += pair;
  }
  return ok(out as DnaSequence);
};

export const reverseComplementDna = (
  seq: DnaSequence,
): KernelResult<DnaSequence> => {
  const complement = complementDna(seq);
  if (!complement.ok) return complement;
  let reversed = "";
  for (let index = complement.value.length - 1; index >= 0; index -= 1) {
    reversed += complement.value.charAt(index);
  }
  return ok(reversed as DnaSequence);
};

export const transcribe = (seq: DnaSequence): KernelResult<RnaSequence> => {
  let out = "";
  for (let index = 0; index < seq.length; index += 1) {
    const letter = seq.charAt(index);
    if (!DNA_ALPHABET.has(letter)) {
      return err(
        "precondition-violated",
        `DNA sequence brand violated: unexpected letter "${letter}" at position ${index}.`,
      );
    }
    out += letter === "T" ? "U" : letter;
  }
  return ok(out as RnaSequence);
};

export const translate = (
  seq: RnaSequence,
  frame: 0 | 1 | 2 = 0,
): KernelResult<ProteinSequence> => {
  if (frame !== 0 && frame !== 1 && frame !== 2) {
    return err(
      "precondition-violated",
      `Reading frame must be 0, 1, or 2; got ${String(frame)}.`,
    );
  }
  if (seq.length - frame < 3) {
    return err(
      "precondition-violated",
      `RNA sequence of length ${seq.length} is too short to translate from frame ${frame}.`,
    );
  }
  let out = "";
  for (let index = frame; index + 3 <= seq.length; index += 3) {
    const codonString = seq.slice(index, index + 3);
    const amino = standardCodonTable[codonString];
    if (amino === undefined) {
      return err(
        "precondition-violated",
        `RNA sequence brand violated: codon "${codonString}" at position ${index} not in standard codon table.`,
      );
    }
    out += amino;
  }
  return ok(out as ProteinSequence);
};

export const gcContent = (
  seq: DnaSequence | RnaSequence,
): KernelResult<number> => {
  if (seq.length === 0) {
    return err("precondition-violated", "GC content is undefined for an empty sequence.");
  }
  let count = 0;
  for (let index = 0; index < seq.length; index += 1) {
    const letter = seq.charAt(index);
    if (!NUCLEOTIDE_ALPHABET.has(letter)) {
      return err(
        "precondition-violated",
        `Sequence brand violated: unexpected letter "${letter}" at position ${index}.`,
      );
    }
    if (letter === "G" || letter === "C") count += 1;
  }
  return ok(count / seq.length);
};

export const hammingDistance = (
  a: string,
  b: string,
): KernelResult<number> => {
  if (typeof a !== "string" || typeof b !== "string") {
    return err("precondition-violated", "Both inputs must be strings.");
  }
  if (a.length !== b.length) {
    return err(
      "precondition-violated",
      `Hamming distance requires equal-length inputs; got ${a.length} and ${b.length}.`,
    );
  }
  let count = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a.charAt(index) !== b.charAt(index)) count += 1;
  }
  return ok(count);
};
