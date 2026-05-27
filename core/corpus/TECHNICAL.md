# core/corpus · Technical Record

## Public Interface

`@paideia/corpus` exports branded document ids, source document, chunk, index,
search hit, citation span, and citation coverage types plus helpers for document
id construction, corpus validation, chunking, indexing, lexical search, and
citation coverage.

The package is pure TypeScript. It does not fetch sources, run embeddings, call
AI/NLP, judge credibility, summarize text, persist data, or import branch code.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Document ids are trimmed, whitespace-free, and not reserved object keys | `corpusDocumentId()` |
| Document ids are unique | `validateCorpus()` |
| Titles and text are non-empty trimmed strings | `validateDocument()` |
| Optional source URLs and licenses are non-empty trimmed strings | `validateDocument()` |
| Chunk sizes are positive safe integers | `chunkDocument()` |
| Chunk offsets exactly identify chunk text inside source text | `chunkDocument()`, `searchCorpus()` index validation, and property test |
| Chunk terms match deterministic lexical tokenization of chunk text | `searchCorpus()` index validation and malformed-index regression test |
| Search query has lexical terms | `searchCorpus()` |
| Search limit is a positive safe integer | `searchCorpus()` |
| Citation spans are safe integer ranges inside text | `citationCoverage()` |
| Citation overlaps are merged before coverage | `mergeRanges()` and tests |
| Inputs are not mutated | non-mutation regression test |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime search, NLP, retrieval, PDF, OCR, or UI package is bundled.

## P2 Followups

- Add `core/corpus` to `docs/core-modules.md` as implemented during the
  end-of-wave docs catalogue refresh.
- If future containers need external retrieval or credibility scoring, create a
  separate contract rather than widening this pure local source-pack kernel.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: lexical search could be mistaken for source truth or credibility.
  Resolution: the package only returns matched chunks and terms; it does not
  judge quality, correctness, or trust. Malformed caller-provided index terms are
  rejected before scoring.

### P1 issues

- Risk: copied source text could become untraceable. Resolution:
  `citationCoverage()` makes cited and uncovered character ranges explicit for
  source-backed prose, and chunk offsets are exact source-string offsets.

### High-bandwidth questions surfaced

- Future authoring surfaces should decide what minimum citation coverage is
  required for generated or contributor-authored explanations.

## Iteration log

- Kept this package independent of network, embeddings, PDF parsing, and UI.
- Added property coverage for chunk offset bounds.
- Added deterministic lexical scoring and tie-breaking.
