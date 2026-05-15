# core/annotation · agent contract

## What this module is
The span-tagging layer for close-reading and source-evaluation activities. It owns the data shape of an annotation, the React components that let a learner select a span of text (or a region of an image) and tag it, and the markdown serialiser that round-trips annotations to a portable on-disk form. It is used by history, literature, and source-reliability sims; not by any math/physics sim.

## Public interface
Exports from `@paideia/annotation`:

- `Annotation = { id: string; target: TextTarget | ImageTarget; tag: string; note?: string; createdAt: number }`
- `TextTarget = { kind: 'text'; start: number; end: number }` — character offsets into the source text.
- `ImageTarget = { kind: 'image'; rect: Rect }` — normalised 0–1 box on the image.
- `<AnnotatableText text={string} annotations={readonly Annotation[]} tags={readonly TagDef[]} onAdd?={(a) => void} onRemove?={(id) => void} />`
- `<AnnotatableImage src={string} annotations={readonly Annotation[]} tags={readonly TagDef[]} onAdd?={(a) => void} onRemove?={(id) => void} />`
- `<AnnotationLayer annotations={readonly Annotation[]} onSelect?={(id) => void} />` — read-only overlay for review/playback.
- `parseAnnotations(md: string): KernelResult<{ text: string; annotations: readonly Annotation[] }>` — reads an inline-marker format from a markdown source.
- `serializeAnnotations(text: string, annotations: readonly Annotation[]): string` — round-trip stable.
- `TagDef = { id: string; label: string; colour?: string; description?: string }`

## Invariants the caller must preserve
- Annotations are read-only inputs; the component does not edit the array, it calls back.
- `TextTarget.start < TextTarget.end` and both within `[0, text.length]`. Out-of-range targets are filtered out with a warning in dev.
- `ImageTarget.rect` is normalised `0..1` so that the annotation survives image resizing.
- `tag` MUST match a `TagDef.id` provided in `tags`; unknown tags are dropped.
- Persistence beyond local state requires explicit learner consent — this module never auto-syncs to a server.

## What this module does NOT do
- Does **not** classify or interpret annotations. The tag is the learner's claim; downstream rubric/Filter judges it.
- Does **not** OCR images.
- Does **not** edit the underlying text or image. Annotations are an overlay.
- Does **not** persist to network storage. Local storage only, behind a caller-owned key.
- Does **not** handle multi-user real-time collaboration.
- Does **not** support arbitrary HTML/MDX as the source — `text` is plain UTF-8 with character offsets.
- Does **not** know subject-specific tag sets — `TagDef[]` is supplied by the caller (history: "bias", "claim", "source-type"; literature: "metaphor", "irony", "voice").

## When to consider this module
Use `core/annotation` when a learner must mark up a passage of text or a region of an image with structured tags — close reading, source reliability, document analysis, image evidence. If the activity is "pick one of these spans", a simpler radio-style component suffices instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (humanities and source-evaluation sims).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to the `Annotation` shape or the markdown round-trip format.

## Anti-patterns (will be rejected in PR review)
- Storing annotations server-side without explicit, in-UI learner consent.
- Pixel-space rectangles for image annotations (must be normalised 0–1).
- Mutating the input `annotations` array to insert/remove.
- Allowing tag strings that aren't in `tags` to be created silently.
- Embedding subject-specific tag sets (e.g. a hard-coded "history" mode) — pass `TagDef[]`.
- Re-implementing serializer inside a consumer instead of round-tripping through `parseAnnotations`/`serializeAnnotations`.

## How the Anieyrudh Filter reads this module
The Filter probes that **the recorded annotation faithfully indexes the passage the learner marked** (start/end offsets resolve to the same characters across re-renders) and that no learner-private annotation leaks beyond the device without consent. An annotation that drifts off its target text on re-mount is a contract violation.
