import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  buildCorpusIndex,
  chunkDocument,
  citationCoverage,
  corpusDocumentId,
  searchCorpus,
  validateCorpus,
  type CorpusDocument,
  type CorpusDocumentId,
} from "./index.js";

const docId = (value: string): CorpusDocumentId => {
  const result = corpusDocumentId(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const source = docId("source_1");
const document: CorpusDocument = {
  id: source,
  title: "Step response note",
  text: "A bounded step response supports stability. Oscillation can attack that claim.",
  sourceUrl: "https://example.test/source",
  license: "CC-BY-4.0",
};

describe("corpusDocumentId", () => {
  it("brands valid ids and rejects whitespace or reserved object keys", () => {
    expect(corpusDocumentId("source_1").ok).toBe(true);
    expect(corpusDocumentId("").ok).toBe(false);
    expect(corpusDocumentId("source 1").ok).toBe(false);
    expect(corpusDocumentId(" source").ok).toBe(false);
    expect(corpusDocumentId("__proto__").ok).toBe(false);
    expect(corpusDocumentId("prototype").ok).toBe(false);
    expect(corpusDocumentId("constructor").ok).toBe(false);
  });
});

describe("validateCorpus", () => {
  it("accepts valid documents without mutating them", () => {
    const docs = [document];
    const before = JSON.stringify(docs);
    const result = validateCorpus(docs);

    expect(result).toEqual({ ok: true, value: docs });
    expect(JSON.stringify(docs)).toBe(before);
  });

  it("rejects duplicate ids and malformed document fields", () => {
    expect(validateCorpus([document, document]).ok).toBe(false);
    expect(validateCorpus([{ ...document, title: " bad " }]).ok).toBe(false);
    expect(validateCorpus([{ ...document, text: "" }]).ok).toBe(false);
    expect(validateCorpus([{ ...document, sourceUrl: " " }]).ok).toBe(false);
    expect(validateCorpus([{ ...document, license: " " }]).ok).toBe(false);
  });
});

describe("chunkDocument", () => {
  it("chunks text with stable offsets and terms", () => {
    const result = chunkDocument(document, 36);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBeGreaterThan(1);
    expect(result.value[0]?.documentId).toBe(source);
    expect(result.value[0]?.text).toBe(document.text.slice(0, result.value[0]?.endOffset));
    expect(result.value[0]?.terms).toContain("bounded");
  });

  it("rejects invalid chunk sizes", () => {
    expect(chunkDocument(document, 0).ok).toBe(false);
    expect(chunkDocument(document, 1.5).ok).toBe(false);
  });

  it("property: chunk offsets remain inside the original text", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter((value) => value.trim().length > 0),
        fc.integer({ min: 1, max: 50 }),
        (text, maxCharacters) => {
          const trimmed = text.trim();
          const result = chunkDocument({ id: source, title: "Generated", text: trimmed }, maxCharacters);
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          for (const chunk of result.value) {
            expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
            expect(chunk.endOffset).toBeLessThanOrEqual(trimmed.length);
            expect(trimmed.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
          }
        },
      ),
    );
  });
});

describe("buildCorpusIndex and searchCorpus", () => {
  it("builds a lexical index and returns deterministic ranked hits", () => {
    const index = buildCorpusIndex([
      document,
      {
        id: docId("source_2"),
        title: "Oscillation note",
        text: "Oscillation can show weak damping in a step response.",
      },
    ], 80);

    expect(index.ok).toBe(true);
    if (!index.ok) return;
    const hits = searchCorpus(index.value, "step oscillation", 5);

    expect(hits.ok).toBe(true);
    if (!hits.ok) return;
    expect(hits.value.length).toBe(2);
    expect(hits.value[0]?.matchedTerms).toContain("step");
    expect(hits.value[0]?.score).toBeGreaterThanOrEqual(hits.value[1]?.score ?? 0);
  });

  it("rejects malformed queries, limits, and chunks", () => {
    const index = buildCorpusIndex([document], 80);
    expect(index.ok).toBe(true);
    if (!index.ok) return;

    expect(searchCorpus(index.value, " !!! ", 5).ok).toBe(false);
    expect(searchCorpus(index.value, "step", 0).ok).toBe(false);
    expect(searchCorpus({
      documents: index.value.documents,
      chunks: [{ ...index.value.chunks[0]!, documentId: docId("missing") }],
    }, "step", 5).ok).toBe(false);
    expect(searchCorpus({
      documents: index.value.documents,
      chunks: [{ ...index.value.chunks[0]!, startOffset: 0, endOffset: 4 }],
    }, "step", 5).ok).toBe(false);
    expect(searchCorpus({
      documents: index.value.documents,
      chunks: [{ ...index.value.chunks[0]!, terms: ["fabricated"] }],
    }, "fabricated", 5).ok).toBe(false);
  });
});

describe("citationCoverage", () => {
  it("merges overlapping citation spans and reports uncovered ranges", () => {
    const result = citationCoverage("abcdef", [
      { documentId: source, startOffset: 0, endOffset: 2 },
      { documentId: source, startOffset: 1, endOffset: 4 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.citedCharacters).toBe(4);
    expect(result.value.totalCharacters).toBe(6);
    expect(result.value.coverageRatio).toBeCloseTo(4 / 6);
    expect(result.value.uncoveredRanges).toEqual([{ startOffset: 4, endOffset: 6 }]);
  });

  it("rejects invalid text and spans", () => {
    expect(citationCoverage(" bad ", []).ok).toBe(false);
    expect(citationCoverage("abc", [{ documentId: source, startOffset: -1, endOffset: 2 }]).ok).toBe(false);
    expect(citationCoverage("abc", [{ documentId: source, startOffset: 2, endOffset: 2 }]).ok).toBe(false);
    expect(citationCoverage("abc", [{ documentId: source, startOffset: 0, endOffset: 4 }]).ok).toBe(false);
  });
});
