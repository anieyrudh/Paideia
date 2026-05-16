import { err, ok, type KernelResult } from "@paideia/shared";
import { z } from "zod";
import type { Annotation } from "./types.js";

interface ParsedMarker {
  readonly start: number;
  readonly end: number;
  readonly annotation: Annotation;
}

const annotationMarkerPattern = (): RegExp => /\[\[paideia-annotation:([^\]]+)\]\]/g;

const intervalSchema = z.object({
  min: z.number().min(0).max(1),
  max: z.number().min(0).max(1),
}).refine((value) => value.min < value.max, "interval must satisfy min < max");

const textTargetSchema = z.object({
  kind: z.literal("text"),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
}).refine((value) => value.start < value.end, "text target must satisfy start < end");

const imageTargetSchema = z.object({
  kind: z.literal("image"),
  rect: z.object({
    x: intervalSchema,
    y: intervalSchema,
  }),
});

const annotationSchema = z.object({
  id: z.string().min(1),
  target: z.union([textTargetSchema, imageTargetSchema]),
  tag: z.string().min(1),
  note: z.string().optional(),
  createdAt: z.number().finite(),
}).transform((value): Annotation => ({
  id: value.id,
  target: value.target,
  tag: value.tag,
  ...(value.note === undefined ? {} : { note: value.note }),
  createdAt: value.createdAt,
}));

const annotationArraySchema = z.array(annotationSchema);

const encode = (annotation: Annotation): string =>
  encodeURIComponent(JSON.stringify(annotation));

const decode = (payload: string): Annotation | null => {
  try {
    return annotationSchema.parse(JSON.parse(decodeURIComponent(payload)));
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
  const markerPattern = annotationMarkerPattern();
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
      const parsed = annotationArraySchema.parse(JSON.parse(imageMatch[1]));
      return ok({ text, annotations: [...annotations, ...parsed] });
    } catch {
      return err("precondition-violated", "Image annotation payload is invalid");
    }
  }

  return ok({ text, annotations });
};
