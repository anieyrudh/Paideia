# core/graph-layout · agent contract

## What this module is
Layout algorithms for node-link diagrams: force-directed in 2D and 3D, hierarchical tree layouts, and small React renderers that consume their output. It wraps `d3-force` and `d3-force-3d` for the simulation steps and exposes deterministic, pure layout functions so that the same graph + seed produces the same coordinates. It is the only place graph layout lives in the monorepo.

## Public interface
Exports from `@paideia/graph-layout`:

- `Graph = { nodes: readonly { id: string; weight?: number }[]; links: readonly { source: string; target: string; strength?: number }[] }`
- `LayoutResult2D = { nodes: readonly { id: string; x: number; y: number }[]; links: readonly { source: string; target: string }[] }`
- `LayoutResult3D = { nodes: readonly { id: string; x: number; y: number; z: number }[]; links: readonly { source: string; target: string }[] }`
- `forceDirected2D(g: Graph, opts?: { iterations?: number; seed?: number; charge?: number; linkDistance?: number }): KernelResult<LayoutResult2D>`
- `forceDirected3D(g: Graph, opts?: { iterations?: number; seed?: number }): KernelResult<LayoutResult3D>`
- `treeLayout(root: TreeNode, opts?: { orientation?: 'vertical' | 'horizontal'; nodeSpacing?: number }): KernelResult<LayoutResult2D>`
- `<ForceGraph2D layout={LayoutResult2D} onNodeClick?={(id) => void} />`
- `<ForceGraph3D layout={LayoutResult3D} />` (lazy-loads `core/three-scene`)
- `<Tree layout={LayoutResult2D} />`

## Invariants the caller must preserve
- Layout functions are **deterministic given a seed**. Same `(g, opts)` → same output. Default seed is `0` (not random).
- Inputs are read-only. The layout function does not sort, dedupe, or rewrite ids.
- `nodes` ids are unique strings; `links` reference existing ids. Violations are `invalid-input` errors.
- Renderers take the `LayoutResult`; they do not run the simulation themselves. Re-layout requires another call.

## What this module does NOT do
- Does **not** do general 2D plotting — `core/plotting`.
- Does **not** do statistical charts — `core/charting`.
- Does **not** do mind-map authoring/editing — `core/mind-map`.
- Does **not** persist layouts. Caller stores coords if a stable layout across sessions matters.
- Does **not** auto-incremental relayout on streaming graph edits — recompute and re-render.
- Does **not** label-place. Renderers position nodes; label collision avoidance is a future concern, not a contract.
- Does **not** know graph semantics (argument graph, concept dependency, citation network) — those live in domain modules and pass `Graph` here.

## When to consider this module
Use `core/graph-layout` when you have nodes and links and need positions on a plane or in 3D — concept-dependency views, argument graphs, citation networks, force-directed gallery layouts. If your nodes are points with known coordinates, you don't need this module; if they're a tree with a clear parent, `treeLayout` is faster and clearer than force-directed.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (concept-map sims, argument-graph sims, course-map renderers).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change that would shift coordinates for an unchanged `(g, opts)` — that breaks pinned snapshots.

## Anti-patterns (will be rejected in PR review)
- Non-deterministic defaults (no seed, `Math.random()` initial positions) — the seed is the contract.
- Running the simulation inside a React effect that re-runs on every render.
- Mutating the input graph.
- Re-implementing d3-force inside a sim — extend the module.
- Branch-specific defaults (`if SUTD then more iterations`) — accept opts.
- Embedding 3D rendering directly here (we lazy-load `core/three-scene` in the renderer to keep the bundle small).

## How the Anieyrudh Filter reads this module
The Filter probes that **layout determinism holds across runs**, that no edge silently disappears or duplicates, and that a tree displayed as a tree is actually a tree (no cycles silently swallowed). A layout that misrepresents graph structure — orphaning nodes, fusing edges — fails review.
