import { describe, expect, it } from "vitest";
import { parseAnnotations, serializeAnnotations } from "./markdown.js";
import { filterAnnotations } from "./validation.js";
import type { Annotation, TagDef } from "./types.js";

const tags: readonly TagDef[] = [{ id: "claim", label: "Claim" }];

describe("annotation markdown", () => {
  it("round-trips text annotations without drifting offsets", () => {
    const annotation: Annotation = {
      id: "a1",
      target: { kind: "text", start: 6, end: 11 },
      tag: "claim",
      note: "central claim",
      createdAt: 1,
    };
    const md = serializeAnnotations("hello world", [annotation]);
    const parsed = parseAnnotations(md);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.text).toBe("hello world");
      expect(parsed.value.annotations[0]?.target).toEqual(annotation.target);
    }
  });

  it("rejects malformed serialized payloads instead of trusting casts", () => {
    const md = `Text\n\n<!-- paideia-image-annotations:${JSON.stringify([
      { id: "bad", target: { kind: "image", rect: { x: { min: 0.8, max: 0.2 }, y: { min: 0, max: 1 } } }, tag: "claim", createdAt: 1 },
    ])} -->`;
    const result = parseAnnotations(md);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("does not let failed global marker scans affect later parses", () => {
    const invalid = parseAnnotations("[[paideia-annotation:not%20json]] before");
    expect(invalid.ok).toBe(false);

    const annotation: Annotation = {
      id: "a1",
      target: { kind: "text", start: 0, end: 5 },
      tag: "claim",
      createdAt: 1,
    };
    const parsed = parseAnnotations(serializeAnnotations("after", [annotation]));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.annotations.map((item) => item.id)).toEqual(["a1"]);
    }
  });

  it("filters unknown tags and out-of-range spans", () => {
    const annotations: readonly Annotation[] = [
      { id: "a", target: { kind: "text", start: 0, end: 5 }, tag: "claim", createdAt: 1 },
      { id: "b", target: { kind: "text", start: 0, end: 50 }, tag: "claim", createdAt: 1 },
      { id: "c", target: { kind: "text", start: 0, end: 1 }, tag: "unknown", createdAt: 1 },
    ];
    expect(filterAnnotations("hello", annotations, tags).map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps only known-tag normalised image boxes", () => {
    const annotations: readonly Annotation[] = [
      {
        id: "image-ok",
        target: { kind: "image", rect: { x: { min: 0.1, max: 0.4 }, y: { min: 0.2, max: 0.8 } } },
        tag: "claim",
        createdAt: 1,
      },
      {
        id: "image-bad-rect",
        target: { kind: "image", rect: { x: { min: 10, max: 40 }, y: { min: 0.2, max: 0.8 } } },
        tag: "claim",
        createdAt: 1,
      },
      {
        id: "image-bad-tag",
        target: { kind: "image", rect: { x: { min: 0.1, max: 0.4 }, y: { min: 0.2, max: 0.8 } } },
        tag: "unknown",
        createdAt: 1,
      },
    ];

    expect(filterAnnotations("", annotations, tags).map((item) => item.id)).toEqual(["image-ok"]);
  });
});
