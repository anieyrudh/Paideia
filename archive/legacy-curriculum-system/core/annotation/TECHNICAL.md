# core/annotation · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `Rect`, `KernelResult`, `ok`, `err` |
| `zod` | markdown payload validation |
| `react` | `useId`, `useMemo`, `useRef`, `useState` |

## Public interface

- `Annotation`
- `TextTarget`
- `ImageTarget`
- `TagDef`
- `AnnotatableText`
- `AnnotatableImage`
- `AnnotationLayer`
- `parseAnnotations`
- `serializeAnnotations`

## Invariants

- Annotation arrays are read-only inputs. Components call back with new
  annotation values and never mutate the caller array.
- Text targets are validated against source text length before rendering.
- Image rectangles are normalised `0..1` boxes.
- Unknown tags are filtered out instead of created silently.
- Markdown round-trips keep text offsets stable across parse/serialize.
- Markdown JSON payloads are parsed only through Zod schemas before becoming
  `Annotation` values.

## Tests

- `src/markdown.test.ts`

## How to run locally

```bash
pnpm -F @paideia/annotation build
pnpm -F @paideia/annotation test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: annotation offsets drift after persistence. Resolution:
  serializer inserts stable inline markers and parser removes markers while
  restoring original text targets; tests assert offset round-trip.
- Potential P0: learner-private annotations leak. Resolution: no network or
  storage API exists in this package; persistence remains caller-owned.
- P0 found in PR review: markdown payloads were trusted through casts after
  `JSON.parse`. Resolution: text and image annotation payloads now pass through
  Zod schemas, including normalised image-rect checks.

### P1 issues

- Repeated-text selections now use DOM range offsets instead of
  `text.indexOf(selection)`, so selecting a later repeated phrase records the
  actual learner-marked span.
- Image annotations now come from pointer-selected normalised rectangles rather
  than a fixed placeholder box.

### High-bandwidth questions surfaced

- Should markdown image annotation payloads stay in HTML comments, or should
  containers store image regions in adjacent JSON when authoring workflows need
  clearer diffs?
