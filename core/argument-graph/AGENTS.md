# core/argument-graph - agent contract

## What this module is

Pure argument graph helpers for claim-evidence-rebuttal structures. It owns
validated argument nodes, directed argumentative relations, deterministic
adjacency, cycle detection, DAG ordering, local neighborhoods, and simple
support/attack balance summaries.

This package computes argument-structure evidence. The consuming app owns copy,
visual layout, pedagogy, source citation display, and whether a learner should
revise a claim.

## Public interface

Exports from `@paideia/argument-graph`:

- `ArgumentNodeId = Brand<string, "ArgumentGraph.NodeId">`
- `ArgumentRelationId = Brand<string, "ArgumentGraph.RelationId">`
- `ArgumentNodeKind = "claim" | "evidence" | "warrant" | "rebuttal" | "question"`
- `ArgumentRelationKind = "supports" | "attacks" | "qualifies" | "depends-on"`
- `ArgumentNode = { id: ArgumentNodeId; kind: ArgumentNodeKind; label: string; sourceId?: string }`
- `ArgumentRelation = { id: ArgumentRelationId; kind: ArgumentRelationKind; from: ArgumentNodeId; to: ArgumentNodeId; weight?: number }`
- `ArgumentGraph = { nodes: readonly ArgumentNode[]; relations: readonly ArgumentRelation[] }`
- `ArgumentAdjacency = { nodeId: ArgumentNodeId; incoming: readonly ArgumentRelation[]; outgoing: readonly ArgumentRelation[] }`
- `ArgumentCycle = { nodeIds: readonly ArgumentNodeId[]; relationIds: readonly ArgumentRelationId[] }`
- `ArgumentBalance = { nodeId: ArgumentNodeId; supports: number; attacks: number; qualifies: number; dependsOn: number; netSupport: number }`
- `ArgumentNeighborhood = { center: ArgumentNode; nodes: readonly ArgumentNode[]; relations: readonly ArgumentRelation[] }`
- `argumentNodeId(value: string): KernelResult<ArgumentNodeId>`
- `argumentRelationId(value: string): KernelResult<ArgumentRelationId>`
- `validateArgumentGraph(graph: ArgumentGraph): KernelResult<ArgumentGraph>`
- `adjacencyFor(graph: ArgumentGraph, nodeId: ArgumentNodeId): KernelResult<ArgumentAdjacency>`
- `detectCycles(graph: ArgumentGraph): KernelResult<readonly ArgumentCycle[]>`
- `topologicalArgumentOrder(graph: ArgumentGraph): KernelResult<readonly ArgumentNodeId[]>`
- `argumentBalance(graph: ArgumentGraph, nodeId: ArgumentNodeId): KernelResult<ArgumentBalance>`
- `neighborhood(graph: ArgumentGraph, nodeId: ArgumentNodeId, depth: number): KernelResult<ArgumentNeighborhood>`

## Invariants the caller must preserve

- Node and relation ids are non-empty trimmed strings with no whitespace and
  are not reserved object keys such as `__proto__`, `prototype`, or
  `constructor`.
- Node ids are unique.
- Relation ids are unique.
- Node labels are non-empty trimmed strings.
- Optional source ids are non-empty trimmed strings when present.
- Relation endpoints reference existing nodes.
- Relations cannot point from a node to itself.
- Relation weights, when present, are finite and non-negative.
- Neighborhood depth is a non-negative integer.
- Results are deterministic and sorted by input graph order unless the function
  documents a traversal order.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render argument maps or diagrams.
- Does not infer truth, correctness, credibility, or grades.
- Does not fetch, parse, or cite source documents.
- Does not run NLP, embeddings, retrieval, or LLM critique.
- Does not persist learner work or telemetry.
- Does not include branch-specific argument templates.

## When to consider this module

Use `core/argument-graph` when a container needs a structured claim, evidence,
warrant, and rebuttal model: debating a design choice, auditing an explanation,
mapping misconceptions, or comparing competing causal claims. If you only need
general node-link positions, use `core/graph-layout`; if you need text corpus
retrieval, use `core/corpus`.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current argument-graph
   consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to relation semantics, balance scoring, cycle
   semantics, or traversal ordering.

## Anti-patterns (will be rejected in PR review)

- Treating supports/attacks as proof of truth.
- Hidden global registries of canonical arguments.
- Branch-specific argument templates.
- Mutating nodes or relations while sorting or traversing.
- Treating missing relation endpoints as isolated nodes.
- Calling AI, retrieval, or source fetchers from this kernel.

## How the Anieyrudh Filter reads this module

The Filter probes that argument structure makes reasoning inspectable without
pretending to settle truth. A good argument graph shows claims, evidence,
warrants, rebuttals, and unresolved questions while keeping credibility and
source judgment outside this pure kernel.
