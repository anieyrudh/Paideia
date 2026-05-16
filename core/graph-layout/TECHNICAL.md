# core/graph-layout · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `KernelResult`, `ok`, `err` |
| `d3-force` | `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter` |
| `d3-force-3d` | `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter` |
| `react` | JSX peer dependency for renderers |

`d3-force` is ISC licensed and `d3-force-3d` is MIT licensed; both are allowed by
`LICENSES.json`.

## Public interface

- `Graph`
- `LayoutResult2D`
- `LayoutResult3D`
- `TreeNode`
- `forceDirected2D`
- `forceDirected3D`
- `treeLayout`
- `ForceGraph2D`
- `ForceGraph3D`
- `Tree`

## Invariants

- Deterministic layout: seeded initial coordinates plus fixed iteration order.
- Input immutability: graph and tree inputs are only read; local mutable working
  arrays hold simulation state.
- Structural fidelity: node order and link multiplicity are preserved in the
  output. Invalid references fail with `precondition-violated`.
- Tree truthfulness: duplicate ids and object-reference cycles fail before
  layout.

## Tests

- `src/index.test.ts`

## How to run locally

```bash
pnpm -F @paideia/graph-layout build
pnpm -F @paideia/graph-layout test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: layout could misrepresent structure by dropping duplicate edges.
  Resolution: link export maps every input link in order; tests assert parallel
  links survive.
- Potential P0: nondeterministic coordinates would break pinned snapshots.
  Resolution: seed defaults to `0`, initial jitter is generated from a pure hash,
  and iteration order is fixed.
- Potential P0: tree cycles or duplicate ids could be silently swallowed.
  Resolution: tree validation rejects both before coordinates are emitted.

### P1 issues

- P1 found in PR review: the first implementation hand-rolled force physics
  despite the AGENTS contract naming d3-force/d3-force-3d. Resolution:
  `forceDirected2D()` and `forceDirected3D()` now run deterministic d3
  simulations over copied node/link data.
- P1 found in PR review: `ForceGraph3D` claimed to lazy-load `core/three-scene`
  even though that Tier 2 package is not implemented yet. Resolution: the
  graph-layout contract now names the current projected SVG renderer and leaves
  full Three.js rendering to `core/three-scene` when it lands.

### High-bandwidth questions surfaced

- Should future visual consumers snapshot exact coordinates, or should they
  snapshot only structural and bounding-box properties?

## Iteration log

- Mirrored `core/prediction-gate` package shape.
- Kept React renderers passive: they consume `LayoutResult*` only.
- Returned shared `KernelResult` errors without changing `@paideia/shared`.
- Added narrow local TypeScript declarations for the d3 packages because these
  runtime packages do not ship first-party `.d.ts` files.
