# @paideia/sequence

Deterministic biological sequence primitives for Paideia simulations. Provides
validated branded types for DNA, RNA, and protein sequences, the NCBI standard
codon table, and pure operations: complement, reverse complement,
transcription, translation, GC content, and Hamming distance.

## Exports

- `DnaSequence`, `RnaSequence`, `ProteinSequence`, `Codon`, `AminoAcid`
- `dnaAlphabet`, `rnaAlphabet`, `proteinAlphabet`
- `standardCodonTable`
- `dna`, `rna`, `protein`, `codon`
- `complementDna`, `reverseComplementDna`
- `transcribe`
- `translate`
- `gcContent`
- `hammingDistance`

## Usage

```ts
import { dna, transcribe, translate } from "@paideia/sequence";

const codingStrand = dna("ATGTTCTAA");
if (!codingStrand.ok) throw new Error(codingStrand.error.message);

const mrna = transcribe(codingStrand.value);
if (!mrna.ok) throw new Error(mrna.error.message);

const protein = translate(mrna.value);
if (!protein.ok) throw new Error(protein.error.message);

// protein.value === "MF*"
```

## Scope

This module owns string-level sequence math. It deliberately does NOT cover
file parsing (FASTA, GenBank), alignment (Needleman-Wunsch, Smith-Waterman),
secondary or tertiary structure, alternate genetic codes, or IUPAC ambiguity
letters. Each of those is a separate kernel or out-of-scope.
