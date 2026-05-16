# core/mind-map · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `KernelResult`, `ok`, `err` |
| `react` | `useMemo`, `useState`, JSX peer dependency |

No new runtime parser or Mermaid dependency is bundled. `LICENSES.json` was
checked on 2026-05-16; this package adds no runtime dependency beyond the
workspace `@paideia/shared`.

## Public interface

- `MindMapNode`
- `Markmap`
- `MindMap`
- `MindMapEditor`
- `parseMarkmap`
- `parseMermaidMindmap`
- `serializeMarkmap`

## Invariants

- Root immutability: parser and editor create new trees; the editor clones the
  initial root into local state.
- Duplicate ids: rejected during parse and validation.
- Structural fidelity: renderers recurse over the exact typed tree. Collapsed
  nodes are retained in the model and only hide descendant rendering.
- Serializer stability: emitted markdown includes `{#id}` markers for exact id
  round-trips plus namespaced Paideia metadata for optional note/collapsed
  fields.

## Tests

- `src/index.test.ts`

## How to run locally

```bash
pnpm -F @paideia/mind-map build
pnpm -F @paideia/mind-map test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: parser could hide structure by silently renaming duplicate ids.
  Resolution: duplicate ids return a failed `KernelResult`; tests cover this.
- Potential P0: Mermaid mindmap input could bypass the canonical tree parser.
  Resolution: `parseMermaidMindmap()` normalizes Mermaid lines into the same
  builder and validation path as markmap source.
- Potential P0: collapsed nodes could disappear from the data model.
  Resolution: collapsed is metadata on `MindMapNode`; rendering suppresses only
  descendant display, not parser output.

### P1 issues

- Free-form markmap markdown has broader syntax than this v0 parser supports.
  Resolution: Tier 1 accepts indented lists, headings, explicit ids, and
  Paideia metadata only; consumers needing wider import support need an ADR.

### High-bandwidth questions surfaced

- Should authoring UIs require explicit ids at creation time, or are stable
  generated ids acceptable for draft-only maps?

## Iteration log

- Mirrored `core/prediction-gate` package shape.
- Kept Mermaid support dependency-free and routed through the canonical parser.
- Added a minimal editor that publishes cloned/new roots rather than mutating
  the `initial` prop.
