# core/graph-layout · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `KernelResult`, `ok`, `err` |
| `react` | JSX peer dependency for renderers |

No new runtime third-party layout dependency is bundled in this v0. `LICENSES.json`
was checked on 2026-05-16; this package adds no runtime dependency beyond the
workspace `@paideia/shared`.

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

- The AGENTS contract names d3-force/d3-force-3d, but Tier 1 delivery avoids new
  runtime dependencies. Resolution: deterministic hand-rolled v0 physics is
  documented here; replacing it later would be a `core!:` coordinate-shifting
  change.

### High-bandwidth questions surfaced

- Should future visual consumers snapshot exact coordinates, or should they
  snapshot only structural and bounding-box properties?

## Iteration log

- Mirrored `core/prediction-gate` package shape.
- Kept React renderers passive: they consume `LayoutResult*` only.
- Returned shared `KernelResult` errors without changing `@paideia/shared`.
