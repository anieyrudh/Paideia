# core/sequence · agent contract

## What this module is

The deterministic biological sequence kernel for Paideia simulations: validated
DNA, RNA, and protein strings; the standard genetic code (codon table); and
pure operations such as complement, reverse-complement, transcription,
translation, GC content, and Hamming distance. It owns the recurring string
math behind gene-expression, mutation-comparison, transcription, and
translation containers so sims do not hand-roll codon tables or alphabet
checks.

## Public interface

Exports from `@paideia/sequence`:

- `type DnaSequence` — branded uppercase string over `{A, C, G, T}`.
- `type RnaSequence` — branded uppercase string over `{A, C, G, U}`.
- `type ProteinSequence` — branded uppercase string over the 20 standard amino
  acids plus the stop symbol `*`.
- `type Codon` — branded uppercase three-letter RNA string.
- `type AminoAcid` — branded one-letter amino-acid string (or `*`).
- `dnaAlphabet`, `rnaAlphabet`, `proteinAlphabet` — frozen readonly sets of
  allowed letters.
- `standardCodonTable: Readonly<Record<string, string>>` — the 64-entry NCBI
  translation table 1, mapping `Codon → AminoAcid` with stop codons mapped to
  `*`.
- `dna(input: string): KernelResult<DnaSequence>` — uppercases, validates
  alphabet, rejects empty.
- `rna(input: string): KernelResult<RnaSequence>` — same shape.
- `protein(input: string): KernelResult<ProteinSequence>` — same shape.
- `codon(input: string): KernelResult<Codon>` — exactly three RNA letters.
- `complementDna(seq: DnaSequence): KernelResult<DnaSequence>` — base-by-base
  Watson-Crick complement (A<->T, C<->G).
- `reverseComplementDna(seq: DnaSequence): KernelResult<DnaSequence>` —
  reverse then complement (biological 5' to 3' opposite-strand reading).
- `transcribe(seq: DnaSequence): KernelResult<RnaSequence>` — coding strand
  rule: replace `T` with `U`, length preserved.
- `translate(seq: RnaSequence, frame?: 0 | 1 | 2): KernelResult<ProteinSequence>`
  — split into codons starting at `frame`, look up each codon in
  `standardCodonTable`. Stops are emitted as `*`. Trailing 1 or 2 bases that
  do not form a full codon are ignored.
- `gcContent(seq: DnaSequence | RnaSequence): KernelResult<number>` — fraction
  of `G` and `C` letters, in `[0, 1]`. Returns `precondition-violated` for
  zero-length input.
- `hammingDistance(a: string, b: string): KernelResult<number>` — equal-length
  position-by-position mismatch count.

## Invariants the caller must preserve

- Sequences are uppercase strings over their declared alphabet. Constructors
  enforce this and brand the result; downstream operations trust the brand.
- Indices are zero-based. `frame` is one of `0`, `1`, or `2`.
- The codon table is the NCBI standard genetic code (translation table 1).
  Mitochondrial or alternative codes are out of scope.
- All operations are pure: they never mutate inputs and never store hidden
  state.

## What this module does NOT do

- Does **not** parse FASTA, FASTQ, GenBank, or any other file format.
- Does **not** perform alignment (Needleman-Wunsch, Smith-Waterman). Hamming
  distance is the only similarity primitive.
- Does **not** model secondary or tertiary structure. RNA folding and protein
  folding live in their own kernels.
- Does **not** support degenerate / IUPAC ambiguity codes (`N`, `R`, `Y`,
  etc.). Sequences are over the four-letter alphabets only.
- Does **not** expose alternate genetic codes. The standard code is sufficient
  for the current curriculum.
- Does **not** render anything. Renderers consume the sequences via
  `Renderer<DnaSequence, R>` style adapters in render kernels.

## When to consider this module

Use `core/sequence` when a sim needs to validate DNA / RNA / protein letters,
compute complements, transcribe coding-strand DNA to mRNA, translate mRNA into
protein with the standard codon table, count GC content, or measure Hamming
distance between equal-length strings. If a container is about to inline a
codon table or write its own A<->T pairing, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change that:
   - alters the four canonical alphabets,
   - changes the standard codon table,
   - changes the brand identity of any exported type,
   - relaxes the empty-input rejection rule.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures
  instead of `KernelResult.err(...)`.
- Accepting lower-case or mixed-case sequences without normalising or
  rejecting at the boundary.
- Mutating the caller's input string (impossible for strings, but the same
  rule applies to arrays returned from this module).
- Exposing alternate genetic codes through the same `translate` symbol —
  alternates require a separate function and a contract change.
- Adding IUPAC ambiguity codes without an ADR and a misconception map.
