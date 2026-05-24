# core/corpus - agent contract

## What this module is

Pure corpus helpers for small educational source packs. It owns validated
documents, deterministic text chunking, lexical indexing, lexical search, and
citation coverage summaries. It helps containers make source-backed content
inspectable without each branch inventing ad hoc search or citation math.

This package computes corpus evidence only. The consuming app owns UI, source
selection, pedagogy, copyright review, and whether a source is trustworthy.

## Public interface

Exports from `@paideia/corpus`:

- `CorpusDocumentId = Brand<string, "Corpus.DocumentId">`
- `CorpusDocument = { id: CorpusDocumentId; title: string; text: string; sourceUrl?: string; license?: string }`
- `CorpusChunk = { documentId: CorpusDocumentId; chunkId: string; text: string; startOffset: number; endOffset: number; terms: readonly string[] }`
- `CorpusIndex = { documents: readonly CorpusDocument[]; chunks: readonly CorpusChunk[] }`
- `SearchHit = { chunk: CorpusChunk; score: number; matchedTerms: readonly string[] }`
- `CitationSpan = { documentId: CorpusDocumentId; startOffset: number; endOffset: number }`
- `CitationCoverage = { citedCharacters: number; totalCharacters: number; coverageRatio: number; uncoveredRanges: readonly { startOffset: number; endOffset: number }[] }`
- `corpusDocumentId(value: string): KernelResult<CorpusDocumentId>`
- `validateCorpus(documents: readonly CorpusDocument[]): KernelResult<readonly CorpusDocument[]>`
- `chunkDocument(document: CorpusDocument, maxCharacters: number): KernelResult<readonly CorpusChunk[]>`
- `buildCorpusIndex(documents: readonly CorpusDocument[], maxCharacters: number): KernelResult<CorpusIndex>`
- `searchCorpus(index: CorpusIndex, query: string, limit?: number): KernelResult<readonly SearchHit[]>`
- `citationCoverage(text: string, citations: readonly CitationSpan[]): KernelResult<CitationCoverage>`

## Invariants the caller must preserve

- Document ids are non-empty trimmed strings with no whitespace and are not
  reserved object keys such as `__proto__`, `prototype`, or `constructor`.
- Document ids are unique.
- Document titles and text are non-empty trimmed strings.
- Optional source URLs and licenses are non-empty trimmed strings when present.
- Chunk sizes are positive safe integers.
- Chunk offsets are exact string offsets and satisfy `0 <= start < end`.
- Search query has at least one lexical term.
- Search limit is a positive safe integer when present.
- Citation spans are finite safe integer ranges within the text.
- Citation coverage merges overlapping spans before computing coverage.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not fetch web pages, PDFs, or remote documents.
- Does not run embeddings, vector search, OCR, NLP, or AI critique.
- Does not decide source credibility, copyright status, or syllabus relevance.
- Does not summarize, paraphrase, or generate learner-facing content.
- Does not persist documents, learner state, or telemetry.
- Does not include branch-specific source packs or ranking boosts.

## When to consider this module

Use `core/corpus` when a container needs local source-pack search, text chunking,
or citation coverage over already-provided documents. If you need argument
structure, use `core/argument-graph`; if you need source credibility or external
retrieval, add a separate contract before implementation.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current corpus consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to chunking, tokenization, scoring, or citation
   coverage semantics.

## Anti-patterns (will be rejected in PR review)

- Fetching or scraping remote content from the kernel.
- Treating lexical score as truth, credibility, or quality.
- Hidden branch-specific ranking boosts.
- Mutating caller documents while chunking or indexing.
- Silent fallback to empty search results for malformed inputs.
- Bundling GPL/proprietary source material into tests or examples.

## How the Anieyrudh Filter reads this module

The Filter probes that source-backed work stays inspectable and honest. Corpus
helpers must make citation coverage visible, avoid pretending lexical search is
understanding, and never hide missing or malformed sources.
