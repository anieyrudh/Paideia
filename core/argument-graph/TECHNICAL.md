# core/argument-graph · Technical Record

## Public Interface

`@paideia/argument-graph` exports branded argument node and relation ids,
argument node/relation/graph types, adjacency, cycle, balance, and neighborhood
types plus helpers for id construction, graph validation, adjacency, cycle
detection, topological ordering, balance summaries, and neighborhood extraction.

The package is pure TypeScript. It does not render diagrams, fetch sources, run
AI/NLP, grade claims, persist learner work, or import branch code.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Node and relation ids are trimmed, whitespace-free, and not reserved object keys | `argumentNodeId()` and `argumentRelationId()` |
| Node and relation kinds are valid enum members | `validateNode()` and `validateRelation()` |
| Node ids are unique | `validateArgumentGraph()` |
| Relation ids are unique | `validateArgumentGraph()` |
| Node labels are non-empty trimmed strings | `validateNode()` |
| Optional source ids are non-empty trimmed strings | `validateNode()` |
| Relation endpoints reference nodes | `validateRelation()` |
| Relations cannot point to themselves | `validateRelation()` |
| Relation weights are finite and non-negative | `validateRelation()` |
| Neighborhood depth is a non-negative integer | `neighborhood()` |
| Traversal output is deterministic and input-order stable where dependencies allow | adjacency/order tests and branching DAG property test |
| Inputs are not mutated | non-mutation regression test |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime graph, NLP, retrieval, rendering, or UI package is bundled.

## P2 Followups

- Add `core/argument-graph` to `docs/core-modules.md` as implemented during
  the end-of-wave docs catalogue refresh.
- If a future container needs credibility scoring or source quality, route that
  through a separate source/corpus contract instead of widening this graph
  kernel into a truth engine.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: an argument graph could be mistaken for a truth oracle. Resolution:
  the public contract only computes structure, adjacency, cycles, neighborhoods,
  and explicit support/attack balance; it does not infer correctness.

### P1 issues

- Risk: missing endpoints or duplicate ids could hide broken reasoning maps.
  Resolution: validation rejects duplicate ids, missing endpoints, self edges,
  invalid weights, and invalid labels before analysis.

### High-bandwidth questions surfaced

- Future learner surfaces should decide whether to show `netSupport` at all or
  emphasize unresolved questions and rebuttals first.

## Iteration log

- Kept this package independent of graph rendering, layout, retrieval, and AI.
- Added cycle detection rather than rejecting cycles globally, because argument
  maps may contain circular reasoning that should be visible.
- Added property coverage for linear and branching DAG topological ordering.
