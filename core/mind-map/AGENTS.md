# core/mind-map · agent contract

## What this module is
Mind-map authoring and rendering. It owns a read-mode renderer that consumes markmap-flavoured markdown (and Mermaid mindmap syntax) and an interactive editor built on top. It is the canonical place to render a concept hierarchy, a study-notes outline, or a brainstorming tree across the monorepo, so that mind-maps look and behave consistently regardless of where they appear.

## Public interface
Exports from `@paideia/mind-map`:

- `MindMapNode = { id: string; label: string; children?: readonly MindMapNode[]; note?: string; collapsed?: boolean }`
- `<Markmap source={string} format?={'markmap' | 'mermaid'} onNodeClick?={(id) => void} />` — read-only renderer from markdown source.
- `<MindMap root={MindMapNode} onNodeClick?={(id) => void} />` — read-only renderer from typed tree.
- `<MindMapEditor initial={MindMapNode} onChange={(root: MindMapNode) => void} />` — interactive: add/remove/rename/reparent nodes.
- `parseMarkmap(source: string): KernelResult<MindMapNode>`
- `parseMermaidMindmap(source: string): KernelResult<MindMapNode>`
- `serializeMarkmap(root: MindMapNode): string`

## Invariants the caller must preserve
- `root` is treated as an immutable tree. The editor produces a new `root` via `onChange`; the input is never mutated.
- Node `id`s are unique within the tree; duplicates are an `invalid-input` parse error.
- Serializer round-trip is stable: `parseMarkmap(serializeMarkmap(t))` equals `t` modulo whitespace-only differences in the markdown.
- Mermaid input goes through this module's parser, not a generic Mermaid runtime in the consumer.

## What this module does NOT do
- Does **not** do general node-link layout — `core/graph-layout`. Mind-maps are trees with a centre; not arbitrary graphs.
- Does **not** do concept-dependency rendering (those need a DAG, not a tree) — that's a future `core/concept-map` or a `core/graph-layout` consumer.
- Does **not** auto-suggest nodes or labels via a model — that's an authoring concern, not a rendering one.
- Does **not** persist across sessions — caller owns storage.
- Does **not** support real-time multi-user collaboration.
- Does **not** import arbitrary OPML/FreeMind formats. Markmap and Mermaid mindmap only.

## When to consider this module
Use `core/mind-map` when you want to render or let a learner build a hierarchical outline rooted at a single concept — study notes, a chapter overview, a brainstorm. If you have a DAG (multiple parents), use `core/graph-layout` instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (concept-package overviews, study tools).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to `MindMapNode`, the editor's `onChange` contract, or the serializer's output shape.

## Anti-patterns (will be rejected in PR review)
- Embedding a separate Mermaid runtime in a consumer to render a mindmap — route through `<Markmap format="mermaid">`.
- Editor implementations that mutate `initial` in place.
- Tolerating duplicate ids by auto-renaming silently.
- Branch-specific node decoration (`if SUTD then add badge`) — accept a `nodeRenderer` prop.
- Drifting from markmap's expected markdown conventions (indented lists) without an ADR.

## How the Anieyrudh Filter reads this module
The Filter probes that **the rendered tree is exactly the tree the source declares** — no collapsed nodes that disappear from the data model, no auto-merged duplicate labels, no silently dropped children. A mind-map that reads cleanly but hides structure from the learner fails review.
