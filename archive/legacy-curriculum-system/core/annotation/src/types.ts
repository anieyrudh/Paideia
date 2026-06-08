import type { Rect } from "@paideia/shared";

export interface TextTarget {
  readonly kind: "text";
  readonly start: number;
  readonly end: number;
}

export interface ImageTarget {
  readonly kind: "image";
  readonly rect: Rect;
}

export type AnnotationTarget = TextTarget | ImageTarget;

export interface Annotation {
  readonly id: string;
  readonly target: AnnotationTarget;
  readonly tag: string;
  readonly note?: string;
  readonly createdAt: number;
}

export interface TagDef {
  readonly id: string;
  readonly label: string;
  readonly colour?: string;
  readonly description?: string;
}
