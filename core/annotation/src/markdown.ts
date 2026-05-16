import { err, ok, type KernelResult } from "@paideia/shared";
import type { Annotation } from "./types.js";

interface ParsedMarker {
  readonly start: number;
  readonly end: number;
  readonly annotation: Annotation;
}

const markerPattern = /\[\[paideia-annotation:([^\]]+)\]\]/g;

const encode = (annotation: Annotation): string =>
  encodeURIComponent(JSON.stringify(annotation));

const decode = (payload: string): Annotation | null => {
  try {
    const parsed = JSON.parse(decodeURIComponent(payload)) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Partial<Annotation>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.tag !== "string" ||
      typeof candidate.createdAt !== "number" ||
      typeof candidate.target !== "object" ||
      candidate.target === null
    ) {
      return null;
    }
    return candidate as Annotation;
  } catch {
    return null;
  }
};

export const serializeAnnotations = (
  text: string,
  annotations: readonly Annotation[],
): string => {
  const textAnnotations = annotations
    .filter((annotation) => annotation.target.kind === "text")
    .map((annotation) => ({
      annotation,
      start: annotation.target.kind === "text" ? annotation.target.start : 0,
    }))
    .sort((a, b) => b.start - a.start || a.annotation.id.localeCompare(b.annotation.id));

  let output = text;
  for (const item of textAnnotations) {
    const marker = `[[paideia-annotation:${encode(item.annotation)}]]`;
    output = `${output.slice(0, item.start)}${marker}${output.slice(item.start)}`;
  }

  const imageAnnotations = annotations.filter((annotation) => annotation.target.kind === "image");
  if (imageAnnotations.length === 0) return output;
  return `${output}\n\n<!-- paideia-image-annotations:${JSON.stringify(imageAnnotations)} -->`;
};

export const parseAnnotations = (
  md: string,
): KernelResult<{ readonly text: string; readonly annotations: readonly Annotation[] }> => {
  const markers: ParsedMarker[] = [];
  let match: RegExpExecArray | null;
  while ((match = markerPattern.exec(md)) !== null) {
    const payload = match[1];
    if (payload === undefined) {
      return err("precondition-violated", "Annotation marker has no payload");
    }
    const annotation = decode(payload);
    if (annotation === null) {
      return err("precondition-violated", "Annotation marker payload is invalid");
    }
    markers.push({ start: match.index, end: markerPattern.lastIndex, annotation });
  }

  const text = md.replace(markerPattern, "").replace(/\n\n<!-- paideia-image-annotations:.* -->$/s, "");
  const annotations = markers.map((marker) => {
    return marker.annotation;
  });

  const imageMatch = md.match(/\n\n<!-- paideia-image-annotations:(.*) -->$/s);
  if (imageMatch?.[1] !== undefined) {
    try {
      const parsed = JSON.parse(imageMatch[1]) as unknown;
      if (Array.isArray(parsed)) {
        return ok({ text, annotations: [...annotations, ...(parsed as Annotation[])] });
      }
    } catch {
      return err("precondition-violated", "Image annotation payload is invalid");
    }
  }

  return ok({ text, annotations });
};
