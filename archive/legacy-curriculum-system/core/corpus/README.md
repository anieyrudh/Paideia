# @paideia/corpus

Pure helpers for local educational source packs.

This package validates source documents, chunks text deterministically, builds a
small lexical index, searches it, and computes citation coverage. It does not
fetch documents, call AI, run embeddings, decide credibility, or generate
learner-facing prose.

## Example

```ts
import { buildCorpusIndex, corpusDocumentId, searchCorpus } from "@paideia/corpus";

const id = corpusDocumentId("source_1");

if (id.ok) {
  const index = buildCorpusIndex([
    {
      id: id.value,
      title: "Lab notes",
      text: "A bounded step response supports stability for this plant.",
      license: "CC-BY-4.0",
    },
  ], 120);

  const hits = index.ok ? searchCorpus(index.value, "bounded stability", 5) : index;

  if (hits.ok) {
    // hits.value[0].matchedTerms contains the query terms found in the chunk.
  }
}
```

## Conventions

- Search is lexical and deterministic, not semantic.
- Scores are evidence for matching text, not source quality.
- Chunk offsets are offsets into the original document string.
- Citation coverage is character-based after overlapping spans are merged.
