import { useId, useMemo, useState } from "react";
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

  const captureSelection = () => {
    const selection = globalThis.getSelection?.();
    const rangeText = selection?.toString() ?? "";
    if (rangeText.length === 0) return;
    const start = text.indexOf(rangeText);
    if (start < 0) return;
    setSelected({ start, end: start + rangeText.length });
  };

  const add = () => {
    if (selected === null || tag === "") return;
    onAdd?.(buildAnnotation({ kind: "text", start: selected.start, end: selected.end }, tag, note));
    setSelected(null);
    setNote("");
  };

  return (
    <section>
      <p onMouseUp={captureSelection}>
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

export const AnnotatableImage = ({
  src,
  annotations,
  tags,
  onAdd,
  onRemove,
}: AnnotatableImageProps) => {
  const [tag, setTag] = useState(firstTag(tags)?.id ?? "");
  const [note, setNote] = useState("");
  const imageAnnotations = filterAnnotations("", annotations, tags).filter(
    (annotation) => annotation.target.kind === "image",
  );
  const add = () => {
    if (tag === "") return;
    onAdd?.(
      buildAnnotation(
        { kind: "image", rect: { x: { min: 0.25, max: 0.75 }, y: { min: 0.25, max: 0.75 } } },
        tag,
        note,
      ),
    );
  };

  return (
    <section>
      <div style={{ display: "inline-block", position: "relative" }}>
        <img alt="" src={src} style={{ display: "block", maxWidth: "100%" }} />
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
      <button disabled={tag === ""} onClick={add} type="button">
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
