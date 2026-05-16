import type { Rect } from "@paideia/shared";
import type { Annotation, TagDef, TextTarget } from "./types.js";

const validRectInterval = (min: number, max: number): boolean =>
  Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max <= 1 && min < max;

export const validImageRect = (rect: Rect): boolean =>
  validRectInterval(rect.x.min, rect.x.max) && validRectInterval(rect.y.min, rect.y.max);

export const validTextTarget = (target: TextTarget, text: string): boolean =>
  Number.isInteger(target.start) &&
  Number.isInteger(target.end) &&
  target.start >= 0 &&
  target.start < target.end &&
  target.end <= text.length;

export const filterAnnotations = (
  text: string,
  annotations: readonly Annotation[],
  tags: readonly TagDef[],
): readonly Annotation[] => {
  const tagIds = new Set(tags.map((tag) => tag.id));
  return annotations.filter((annotation) => {
    if (!tagIds.has(annotation.tag)) return false;
    if (annotation.target.kind === "text") return validTextTarget(annotation.target, text);
    return validImageRect(annotation.target.rect);
  });
};
