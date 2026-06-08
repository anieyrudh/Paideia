# core/signal-pathway · agent contract

## What this module is

The deterministic signalling-cascade kernel: a small directed graph of nodes,
activation / inhibition edges, a saturating-response activation function, and
a synchronous propagation step that maps caller-supplied input signals to
steady-state output signals across the graph. Owns the primitives that
recurring sims would otherwise hand-roll for MAPK-style cascades, two-stage
receptor models, and feed-forward loops.

This kernel intentionally stays at **deterministic synchronous propagation
over a directed graph**. It does not own time-resolved ODE integration,
stochastic noise, ligand-binding kinetics, or pathway-file parsing.

## Public interface

Exports from `@paideia/signal-pathway`:

- `type SignalLevel` — branded number in `[0, 1]`.
- `type EdgeWeight` — branded number in `[0, 1]`.
- `type NodeId` — branded non-empty string.
- `type EdgeEffect` — `"activate" | "inhibit"`.
- `interface CascadeNode` — `{ id: NodeId; basal: SignalLevel; threshold: SignalLevel; sensitivity: number }`.
- `interface CascadeEdge` — `{ from: NodeId; to: NodeId; effect: EdgeEffect; weight: EdgeWeight }`.
- `interface CascadeGraph` — `{ nodes: ReadonlyArray<CascadeNode>; edges: ReadonlyArray<CascadeEdge> }`.
- `interface PropagationResult` — `{ outputs: ReadonlyMap<NodeId, SignalLevel>; order: ReadonlyArray<NodeId> }`.
- `signalLevel(value: number): KernelResult<SignalLevel>`
- `edgeWeight(value: number): KernelResult<EdgeWeight>`
- `nodeId(value: string): KernelResult<NodeId>`
- `sensitivity(value: number): KernelResult<number>` — accepts strictly positive finite numbers; used as the slope of the saturating response.
- `saturatingResponse(effectiveInput: number, threshold: SignalLevel, sensitivity: number): KernelResult<SignalLevel>` — logistic-shaped, equals `1 / (1 + exp(-sensitivity · (input − threshold)))`, mapped through clamp to `[0, 1]`.
- `effectiveInput(node: CascadeNode, incoming: ReadonlyArray<{ effect: EdgeEffect; weight: EdgeWeight; upstream: SignalLevel }>): KernelResult<number>` — `sum_{activator} w·x − sum_{inhibitor} w·x`.
- `propagate(graph: CascadeGraph, inputs: ReadonlyMap<NodeId, SignalLevel>): KernelResult<PropagationResult>` — topologically sorts the graph (rejects cycles with `precondition-violated`), seeds each node with either its caller-supplied input or its `basal`, then walks the order computing `saturatingResponse(effectiveInput, threshold, sensitivity)` per node.

## Invariants the caller must preserve

- `SignalLevel` and `EdgeWeight` are in `[0, 1]`. The constructors enforce
  this; downstream operations re-validate at the boundary so forged brands
  still surface typed errors.
- `NodeId` is a non-empty string. The graph rejects unknown source / target
  IDs in edges.
- Sensitivity is strictly positive. A zero sensitivity collapses the
  saturating response to a constant and is rejected so callers get a clear
  failure rather than a silent flat curve.
- The graph is a DAG: cycles return `precondition-violated`. Feedback loops
  are pedagogically important but require time-resolved integration, which
  belongs in `core/dynamical-systems`.

## What this module does NOT do

- Does **not** integrate ODE-style time evolution. Use `core/dynamical-systems`
  with a per-node derivative function for time-resolved cascades.
- Does **not** model stochastic single-molecule events.
- Does **not** model ligand-receptor binding kinetics, GTP-hydrolysis, or any
  specific molecular mechanism. The saturating-response function is a
  generic logistic that callers parameterise.
- Does **not** parse SBGN, BioPAX, KEGG, or any pathway file format.
- Does **not** render anything.

## When to consider this module

Use `core/signal-pathway` when a sim needs a synchronous response of a small
cascade (e.g. ligand → receptor → kinase → transcription factor) given input
levels for the source nodes. If a container is about to inline
`1 / (1 + Math.exp(-k * (x - x0)))`, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the saturating-response shape,
   - changes the effective-input convention (activator/inhibitor signs),
   - changes the brand identity of any exported type,
   - relaxes the DAG requirement in `propagate`.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Allowing cycles silently. Cycles must surface as
  `precondition-violated` until a time-stepped variant exists.
- Hard-coding molecular labels (`MAPK1`, `EGFR`). All node IDs come from the
  container.
- Adding stochastic noise inside the deterministic propagation. Stochastic
  models are a separate kernel.
