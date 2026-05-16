import { useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Rect } from "@paideia/shared";
import type { Annotation, TagDef } from "./types.js";
import { filterAnnotations } from "./validation.js";

interface AnnotatableTextProps {
  readonly text: string;
  readonly annotations: readonly Annotation[];
  readonly tags: readonly TagDef[];
  readonly onAdd?: (a: Annotation) => void;
  readonly onRemove?: (id: string) => void;
}

interface AnnotatableImageProps {
  readonly src: string;
  readonly annotations: readonly Annotation[];
  readonly tags: readonly TagDef[];
  readonly onAdd?: (a: Annotation) => void;
  readonly onRemove?: (id: string) => void;
}

interface AnnotationLayerProps {
  readonly annotations: readonly Annotation[];
  readonly onSelect?: (id: string) => void;
}

const firstTag = (tags: readonly TagDef[]): TagDef | undefined => tags[0];

const tagColour = (tagId: string, tags: readonly TagDef[]): string =>
  tags.find((tag) => tag.id === tagId)?.colour ?? "#fde68a";

const buildAnnotation = (
  target: Annotation["target"],
  tag: string,
  note: string,
): Annotation => ({
  id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  target,
  tag,
  ...(note.trim() === "" ? {} : { note: note.trim() }),
  createdAt: Date.now(),
});

const textOffsetWithin = (
  root: HTMLElement,
  container: Node,
  offset: number,
): number | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node = walker.nextNode();
  while (node !== null) {
    if (node === container) return total + offset;
    total += node.textContent?.length ?? 0;
    node = walker.nextNode();
  }
  return null;
};

export const AnnotatableText = ({
  text,
  annotations,
  tags,
  onAdd,
  onRemove,
}: AnnotatableTextProps) => {
  const [selected, setSelected] = useState<{ readonly start: number; readonly end: number } | null>(null);
  const [tag, setTag] = useState(firstTag(tags)?.id ?? "");
  const [note, setNote] = useState("");
  const filtered = useMemo(() => filterAnnotations(text, annotations, tags), [text, annotations, tags]);
  const inputId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);

  const captureSelection = () => {
    const selection = globalThis.getSelection?.();
    const root = textRef.current;
    if (selection === undefined || selection === null || root === null || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
    const start = textOffsetWithin(root, range.startContainer, range.startOffset);
    const end = textOffsetWithin(root, range.endContainer, range.endOffset);
    if (start === null || end === null || start === end) return;
    setSelected({ start: Math.min(start, end), end: Math.max(start, end) });
  };

  const add = () => {
    if (selected === null || tag === "") return;
    onAdd?.(buildAnnotation({ kind: "text", start: selected.start, end: selected.end }, tag, note));
    setSelected(null);
    setNote("");
  };

  return (
    <section>
      <p onMouseUp={captureSelection} ref={textRef}>
        {text.split("").map((char, index) => {
          const active = filtered.find(
            (annotation) =>
              annotation.target.kind === "text" &&
              index >= annotation.target.start &&
              index < annotation.target.end,
          );
          return (
            <mark
              key={`${index}:${char}`}
              onClick={() => active !== undefined && onRemove?.(active.id)}
              style={{ background: active === undefined ? "transparent" : tagColour(active.tag, tags) }}
            >
              {char}
            </mark>
          );
        })}
      </p>
      <label htmlFor={inputId}>Tag</label>
      <select id={inputId} onChange={(event) => setTag(event.currentTarget.value)} value={tag}>
        {tags.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label>
        Note
        <textarea onChange={(event) => setNote(event.currentTarget.value)} value={note} />
      </label>
      <button disabled={selected === null || tag === ""} onClick={add} type="button">
        Add annotation
      </button>
    </section>
  );
};

const rectStyle = (rect: Rect) => ({
  height: `${(rect.y.max - rect.y.min) * 100}%`,
  left: `${rect.x.min * 100}%`,
  top: `${rect.y.min * 100}%`,
  width: `${(rect.x.max - rect.x.min) * 100}%`,
});

const normaliseRect = (start: readonly [number, number], end: readonly [number, number]): Rect => ({
  x: { min: Math.min(start[0], end[0]), max: Math.max(start[0], end[0]) },
  y: { min: Math.min(start[1], end[1]), max: Math.max(start[1], end[1]) },
});

const pointInElement = (event: PointerEvent<HTMLElement>): readonly [number, number] => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / Math.max(1, bounds.width);
  const y = (event.clientY - bounds.top) / Math.max(1, bounds.height);
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
};

export const AnnotatableImage = ({
  src,
  annotations,
  tags,
  onAdd,
  onRemove,
}: AnnotatableImageProps) => {
  const [tag, setTag] = useState(firstTag(tags)?.id ?? "");
  const [note, setNote] = useState("");
  const [dragStart, setDragStart] = useState<readonly [number, number] | null>(null);
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const imageAnnotations = filterAnnotations("", annotations, tags).filter(
    (annotation) => annotation.target.kind === "image",
  );
  const add = () => {
    if (tag === "" || selectedRect === null) return;
    onAdd?.(
      buildAnnotation({ kind: "image", rect: selectedRect }, tag, note),
    );
    setSelectedRect(null);
    setNote("");
  };

  return (
    <section>
      <div
        onPointerDown={(event) => {
          const point = pointInElement(event);
          setDragStart(point);
          setSelectedRect(normaliseRect(point, point));
        }}
        onPointerMove={(event) => {
          if (dragStart === null) return;
          setSelectedRect(normaliseRect(dragStart, pointInElement(event)));
        }}
        onPointerUp={(event) => {
          if (dragStart === null) return;
          setSelectedRect(normaliseRect(dragStart, pointInElement(event)));
          setDragStart(null);
        }}
        style={{ display: "inline-block", position: "relative", touchAction: "none" }}
      >
        <img alt="" src={src} style={{ display: "block", maxWidth: "100%" }} />
        {selectedRect === null ? null : (
          <div
            aria-label="Selected annotation region"
            style={{
              ...rectStyle(selectedRect),
              background: "rgb(31 95 139 / 0.18)",
              border: "2px dashed #1f5f8b",
              pointerEvents: "none",
              position: "absolute",
            }}
          />
        )}
        {imageAnnotations.map((annotation) =>
          annotation.target.kind === "image" ? (
            <button
              aria-label={`Remove ${annotation.tag} annotation`}
              key={annotation.id}
              onClick={() => onRemove?.(annotation.id)}
              style={{
                ...rectStyle(annotation.target.rect),
                background: "transparent",
                border: `2px solid ${tagColour(annotation.tag, tags)}`,
                position: "absolute",
              }}
              type="button"
            />
          ) : null,
        )}
      </div>
      <select onChange={(event) => setTag(event.currentTarget.value)} value={tag}>
        {tags.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <textarea onChange={(event) => setNote(event.currentTarget.value)} value={note} />
      <button disabled={tag === "" || selectedRect === null} onClick={add} type="button">
        Add region
      </button>
    </section>
  );
};

export const AnnotationLayer = ({
  annotations,
  onSelect,
}: AnnotationLayerProps) => (
  <svg aria-label="Annotation layer" role="img" viewBox="0 0 1 1">
    {annotations.map((annotation) =>
      annotation.target.kind === "image" ? (
        <rect
          fill="transparent"
          height={annotation.target.rect.y.max - annotation.target.rect.y.min}
          key={annotation.id}
          onClick={() => onSelect?.(annotation.id)}
          stroke="#f59e0b"
          strokeWidth="0.005"
          width={annotation.target.rect.x.max - annotation.target.rect.x.min}
          x={annotation.target.rect.x.min}
          y={annotation.target.rect.y.min}
        />
      ) : null,
    )}
  </svg>
);
