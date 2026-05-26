# @paideia/sequence Technical Notes

## Public Interface Summary

The package exports branded string types (`DnaSequence`, `RnaSequence`,
`ProteinSequence`, `Codon`, `AminoAcid`); frozen readonly alphabets
(`dnaAlphabet`, `rnaAlphabet`, `proteinAlphabet`); the 64-entry NCBI standard
codon table (`standardCodonTable`); validating constructors (`dna`, `rna`,
`protein`, `codon`); the Watson-Crick complement operations (`complementDna`,
`reverseComplementDna`); coding-strand transcription (`transcribe`); standard
genetic code translation (`translate`); GC content (`gcContent`); and
position-by-position Hamming distance (`hammingDistance`).

All operations that can fail return `KernelResult<T>` from `@paideia/shared`.
No public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Sequences are uppercase and over their declared alphabet | `dna`, `rna`, `protein`, `codon` uppercase the input and validate letter-by-letter, returning `out-of-domain` on any disallowed letter. Brands are issued only on success. |
| Empty inputs are rejected | All constructors return `precondition-violated` for length-0 input. |
| The codon table cannot be mutated at runtime | `standardCodonTable` is wrapped in `Object.freeze` and exported as `Readonly<Record<...>>`. The freeze is asserted in `index.test.ts`. |
| `complementDna` and `reverseComplementDna` are involutive | Property tests apply each operation twice on a range of branded inputs and expect the original. |
| `transcribe` preserves length | A unit test asserts `length === seq.length`; the implementation only substitutes `T` for `U`. |
| `translate` respects reading frame and ignores trailing 1 or 2 bases | Tests cover frames 0, 1, 2; non-multiple-of-three inputs; and the unsupported `frame = 3` runtime guard. |
| `translate` only uses NCBI table 1 | The implementation looks up directly in `standardCodonTable`. Any RNA codon not in the table triggers `precondition-violated` (which can only happen if the brand contract is violated upstream). |
| `gcContent` is in `[0, 1]` and rejects empty input | Length-checked at entry; counts `G` and `C` letters and divides. |
| `hammingDistance` requires equal-length strings | Constructor-level guard returns `precondition-violated` for unequal lengths or non-string inputs. |
| Public alphabets are read-only sets | Exported as `ReadonlySet<string>`; the set instance is not exposed for mutation. |

## Numerical / Algorithmic Method

The implementation is pure string traversal in single passes. No floating-point
arithmetic except the integer-fraction division in `gcContent`. The branded
types are erased at runtime; the validity guarantee comes from the constructor
guards plus the rule that downstream operations only consume already-branded
inputs.

The standard codon table is encoded literally as a frozen object with all 64
RNA codons mapped to one-letter amino acid symbols (stop codons → `*`). The
mapping itself is a biological fact (NCBI translation table 1) and is not
copyrightable expression.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `err`, `ok`. |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies. `pnpm license:check` continues to
report only the existing 84 production dependencies as compatible.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches the contract in `AGENTS.md` exactly:
  five branded types, three alphabets, one frozen codon table, four
  constructors, three sequence operations, one translation function, GC
  content, and Hamming distance. No `any` in any public signature. No
  exceptions thrown for expected validation failures; every fallible operation
  returns `KernelResult<T>`. The codon table is the NCBI standard genetic
  code (translation table 1) — a public-domain biological fact — and is
  frozen against runtime mutation.

### P1 issues

- The brand-violation branches in `complementDna` and `translate` are
  effectively unreachable through the public API (the brand guarantees the
  alphabet) but the code still returns a typed error rather than throwing, so
  a future upstream regression cannot trip a panic. The defensive branches
  add ~10 lines but pay for themselves in audit clarity.
- The kernel deliberately does not return a structured codon list from
  `translate`. If a downstream container needs per-codon highlighting it can
  splice `seq` into 3-character windows; exposing a richer return type would
  widen the public API without need.

### P2 issues (deferred)

- A separate `core/sequence-alignment` kernel could host Needleman-Wunsch and
  Smith-Waterman so that mutation-comparison containers can highlight
  alignments rather than only count mismatches.
- A `mitochondrialCodonTable` could be added once a container requests it; it
  is intentionally out of scope here.
- A `degenerateAlphabet` toggle for IUPAC codes (`N`, `R`, `Y`, etc.) could be
  added once a container demonstrates pedagogical need; today it would dilute
  the misconception map.

### High-bandwidth questions surfaced

- Should we surface a richer `TranslationTrace { codons: readonly Codon[]; aminoAcids: readonly AminoAcid[] }` return type once a learner-facing container needs per-codon highlighting, or wait for that container to ask? Current call: wait.
- Should `transcribe` also offer a template-strand variant (read 3' to 5', then complement) for completeness? Current call: defer until a container needs it; the coding-strand T→U rule is the canonical one in introductory curricula.
