import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type CorpusDocumentId = Brand<string, "Corpus.DocumentId">;

export interface CorpusDocument {
  readonly id: CorpusDocumentId;
  readonly title: string;
  readonly text: string;
  readonly sourceUrl?: string;
  readonly license?: string;
}

export interface CorpusChunk {
  readonly documentId: CorpusDocumentId;
  readonly chunkId: string;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly terms: readonly string[];
}

export interface CorpusIndex {
  readonly documents: readonly CorpusDocument[];
  readonly chunks: readonly CorpusChunk[];
}

export interface SearchHit {
  readonly chunk: CorpusChunk;
  readonly score: number;
  readonly matchedTerms: readonly string[];
}

export interface CitationSpan {
  readonly documentId: CorpusDocumentId;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface CitationCoverage {
  readonly citedCharacters: number;
  readonly totalCharacters: number;
  readonly coverageRatio: number;
  readonly uncoveredRanges: readonly {
    readonly startOffset: number;
    readonly endOffset: number;
  }[];
}

const reservedIds = new Set(["__proto__", "prototype", "constructor"]);

export const corpusDocumentId = (value: string): KernelResult<CorpusDocumentId> => {
  const valid = validateId(value);
  if (!valid.ok) return valid;
  return ok(valid.value as CorpusDocumentId);
};

export const validateCorpus = (
  documents: readonly CorpusDocument[],
): KernelResult<readonly CorpusDocument[]> => {
  const ids = new Set<string>();
  for (const document of documents) {
    const valid = validateDocument(document);
    if (!valid.ok) return valid;
    if (ids.has(document.id)) {
      return err("precondition-violated", `Duplicate corpus document id: ${document.id}`);
    }
    ids.add(document.id);
  }
  return ok(documents);
};

export const chunkDocument = (
  document: CorpusDocument,
  maxCharacters: number,
): KernelResult<readonly CorpusChunk[]> => {
  const valid = validateDocument(document);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters <= 0) {
    return err("out-of-domain", "maxCharacters must be a positive safe integer");
  }

  const chunks: CorpusChunk[] = [];
  let start = 0;
  while (start < document.text.length) {
    const rawEnd = Math.min(document.text.length, start + maxCharacters);
    let end = rawEnd === document.text.length
      ? rawEnd
      : Math.max(start + 1, lastBreakAtOrBefore(document.text, rawEnd, start));
    while (end > start && /\s/.test(document.text[end - 1] ?? "")) {
      end -= 1;
    }
    const text = document.text.slice(start, end);
    if (text.length > 0) {
      chunks.push({
        documentId: document.id,
        chunkId: `${document.id}:${chunks.length}`,
        text,
        startOffset: start,
        endOffset: end,
        terms: uniqueTerms(text),
      });
    }
    start = skipWhitespace(document.text, end);
  }

  return ok(chunks);
};

export const buildCorpusIndex = (
  documents: readonly CorpusDocument[],
  maxCharacters: number,
): KernelResult<CorpusIndex> => {
  const valid = validateCorpus(documents);
  if (!valid.ok) return valid;
  const chunks: CorpusChunk[] = [];

  for (const document of documents) {
    const documentChunks = chunkDocument(document, maxCharacters);
    if (!documentChunks.ok) return documentChunks;
    chunks.push(...documentChunks.value);
  }

  return ok({ documents, chunks });
};

export const searchCorpus = (
  index: CorpusIndex,
  query: string,
  limit = 10,
): KernelResult<readonly SearchHit[]> => {
  const valid = validateCorpus(index.documents);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    return err("out-of-domain", "Search limit must be a positive safe integer");
  }
  const queryTerms = uniqueTerms(query);
  if (queryTerms.length === 0) {
    return err("precondition-violated", "Search query must contain at least one lexical term");
  }

  const documentsById = new Map(index.documents.map((document) => [document.id, document]));
  const hits: SearchHit[] = [];

  for (const chunk of index.chunks) {
    const validChunk = validateChunk(chunk, documentsById);
    if (!validChunk.ok) return validChunk;
    const matchedTerms = queryTerms.filter((term) => chunk.terms.includes(term));
    if (matchedTerms.length > 0) {
      hits.push({
        chunk,
        score: scoreChunk(chunk, matchedTerms),
        matchedTerms,
      });
    }
  }

  return ok(hits
    .sort((left, right) =>
      right.score - left.score ||
      left.chunk.documentId.localeCompare(right.chunk.documentId) ||
      left.chunk.startOffset - right.chunk.startOffset)
    .slice(0, limit));
};

export const citationCoverage = (
  text: string,
  citations: readonly CitationSpan[],
): KernelResult<CitationCoverage> => {
  if (!isTrimmedNonEmpty(text)) {
    return err("precondition-violated", "Text must be non-empty and trimmed");
  }
  const ranges: { startOffset: number; endOffset: number }[] = [];
  for (const citation of citations) {
    const valid = corpusDocumentId(citation.documentId);
    if (!valid.ok) return valid;
    if (!isValidRange(citation.startOffset, citation.endOffset, text.length)) {
      return err("out-of-domain", "Citation spans must be safe integer ranges inside the text");
    }
    ranges.push({ startOffset: citation.startOffset, endOffset: citation.endOffset });
  }

  const merged = mergeRanges(ranges);
  const citedCharacters = merged.reduce(
    (sum, range) => sum + range.endOffset - range.startOffset,
    0,
  );
  const uncoveredRanges = invertRanges(merged, text.length);

  return ok({
    citedCharacters,
    totalCharacters: text.length,
    coverageRatio: citedCharacters / text.length,
    uncoveredRanges,
  });
};

const validateDocument = (document: CorpusDocument): KernelResult<CorpusDocument> => {
  const id = corpusDocumentId(document.id);
  if (!id.ok) return id;
  if (!isTrimmedNonEmpty(document.title)) {
    return err("precondition-violated", "Corpus document title must be non-empty and trimmed");
  }
  if (!isTrimmedNonEmpty(document.text)) {
    return err("precondition-violated", "Corpus document text must be non-empty and trimmed");
  }
  if (document.sourceUrl !== undefined && !isTrimmedNonEmpty(document.sourceUrl)) {
    return err("precondition-violated", "Corpus document sourceUrl must be non-empty and trimmed");
  }
  if (document.license !== undefined && !isTrimmedNonEmpty(document.license)) {
    return err("precondition-violated", "Corpus document license must be non-empty and trimmed");
  }
  return ok(document);
};

const validateChunk = (
  chunk: CorpusChunk,
  documentsById: ReadonlyMap<string, CorpusDocument>,
): KernelResult<CorpusChunk> => {
  const document = documentsById.get(chunk.documentId);
  if (document === undefined) {
    return err("precondition-violated", `Corpus chunk ${chunk.chunkId} references an unknown document`);
  }
  if (!isTrimmedNonEmpty(chunk.chunkId) || !isTrimmedNonEmpty(chunk.text)) {
    return err("precondition-violated", "Corpus chunk id and text must be non-empty and trimmed");
  }
  if (!isValidRange(chunk.startOffset, chunk.endOffset, document.text.length)) {
    return err("out-of-domain", `Corpus chunk ${chunk.chunkId} has invalid offsets`);
  }
  if (document.text.slice(chunk.startOffset, chunk.endOffset) !== chunk.text) {
    return err("precondition-violated", `Corpus chunk ${chunk.chunkId} text does not match its document offsets`);
  }
  const expectedTerms = uniqueTerms(chunk.text);
  if (!sameTerms(chunk.terms, expectedTerms)) {
    return err("precondition-violated", `Corpus chunk ${chunk.chunkId} terms do not match its text`);
  }
  if (chunk.terms.some((term) => !isTrimmedNonEmpty(term))) {
    return err("precondition-violated", `Corpus chunk ${chunk.chunkId} contains an invalid term`);
  }
  return ok(chunk);
};

const validateId = (value: string): KernelResult<string> =>
  value.length > 0 && value.trim() === value && !/\s/.test(value) && !reservedIds.has(value)
    ? ok(value)
    : err(
      "precondition-violated",
      "Corpus document id must be non-empty, trimmed, contain no whitespace, and avoid reserved object keys",
    );

const uniqueTerms = (text: string): readonly string[] => {
  const terms = text
    .toLocaleLowerCase("en-US")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
  return Array.from(new Set(terms)).sort();
};

const scoreChunk = (chunk: CorpusChunk, matchedTerms: readonly string[]): number =>
  matchedTerms.length / Math.max(1, Math.sqrt(chunk.terms.length));

const sameTerms = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((term, index) => term === right[index]);

const lastBreakAtOrBefore = (text: string, rawEnd: number, start: number): number => {
  for (let index = rawEnd; index > start; index -= 1) {
    const char = text[index - 1];
    if (char !== undefined && /\s/.test(char)) return index;
  }
  return rawEnd;
};

const skipWhitespace = (text: string, index: number): number => {
  let current = index;
  while (current < text.length && /\s/.test(text[current] ?? "")) {
    current += 1;
  }
  return current;
};

const isValidRange = (startOffset: number, endOffset: number, max: number): boolean =>
  Number.isSafeInteger(startOffset) &&
  Number.isSafeInteger(endOffset) &&
  startOffset >= 0 &&
  startOffset < endOffset &&
  endOffset <= max;

const mergeRanges = (
  ranges: readonly { readonly startOffset: number; readonly endOffset: number }[],
): readonly { readonly startOffset: number; readonly endOffset: number }[] => {
  const sorted = [...ranges].sort((left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset);
  const merged: { startOffset: number; endOffset: number }[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.startOffset <= last.endOffset) {
      last.endOffset = Math.max(last.endOffset, range.endOffset);
    } else {
      merged.push({ startOffset: range.startOffset, endOffset: range.endOffset });
    }
  }

  return merged;
};

const invertRanges = (
  ranges: readonly { readonly startOffset: number; readonly endOffset: number }[],
  total: number,
): readonly { readonly startOffset: number; readonly endOffset: number }[] => {
  const uncovered: { startOffset: number; endOffset: number }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (cursor < range.startOffset) {
      uncovered.push({ startOffset: cursor, endOffset: range.startOffset });
    }
    cursor = Math.max(cursor, range.endOffset);
  }
  if (cursor < total) {
    uncovered.push({ startOffset: cursor, endOffset: total });
  }
  return uncovered;
};

const isTrimmedNonEmpty = (value: string): boolean =>
  value.length > 0 && value.trim() === value;
