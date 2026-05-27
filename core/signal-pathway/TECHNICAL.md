# @paideia/signal-pathway Technical Notes

## Public Interface Summary

The package exports three branded numerics/strings (`SignalLevel`,
`EdgeWeight`, `NodeId`), one literal type (`EdgeEffect`), four record types
(`CascadeNode`, `CascadeEdge`, `CascadeGraph`, `PropagationResult`), four
validating constructors, and three operations (`saturatingResponse`,
`effectiveInput`, `propagate`).

All fallible operations return `KernelResult<T>` from `@paideia/shared`. No
public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `SignalLevel` and `EdgeWeight` are in `[0, 1]` | `signalLevel`, `edgeWeight` constructors; `propagate` re-validates every node's basal, threshold, and every supplied input. |
| `NodeId` is a non-empty string | `nodeId` constructor; `propagate` re-validates each node's id and surfaces unknown edge endpoints as `precondition-violated`. |
| `sensitivity` is strictly positive finite | `sensitivity` constructor; `saturatingResponse` re-validates. |
| `propagate` rejects cycles | Topological sort with Kahn's algorithm; if any node remains unsorted, returns `precondition-violated` with the message "graph contains a cycle". |
| `propagate` rejects duplicate node ids | Explicit `Set` check at the start of `topologicalOrder`. |
| `propagate` rejects unknown edge endpoints | Both `edge.from` and `edge.to` are checked against the node-id set. |
| `saturatingResponse` is numerically stable | The implementation uses the `exp(-|z|)` form on the relevant branch, never `exp(huge)`. A unit test asserts finiteness at `x = -1000`. |
| All results stay finite | Every operation re-validates accumulated values for `Number.isFinite`. |

## Numerical / Algorithmic Method

The activation function is a logistic curve:

```text
y = 1 / (1 + exp(-k · (x - threshold)))
```

with the numerically stable rewrite used internally to avoid `exp(+huge)`
overflow. Output is clamped to `[0, 1]` before being re-branded as
`SignalLevel`.

Effective input combines activator and inhibitor edges symmetrically:

```text
effectiveInput = sum_{activator} w·x_upstream − sum_{inhibitor} w·x_upstream
```

`propagate` topologically sorts the graph with Kahn's algorithm and walks
nodes in order. Each non-source node's incoming edges are gathered, and the
node's signal is `saturatingResponse(effectiveInput, threshold, sensitivity)`.
Source nodes (no incoming edges) take either the caller-supplied input or
their `basal` value.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `approxEqual`, `err`, `ok`. |
| `fast-check` | dev | `^3.23.2` | MIT | Property-test runner only (already in workspace). |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies.

## Test Strategy

- **Constructor coverage:** every constructor has happy-path and at least one
  rejection test.
- **Activation:** threshold-equals-0.5 anchor; saturation toward 0 and 1;
  numerical stability at extreme negative input; monotonicity property.
- **Effective input:** activator and inhibitor signs; empty list; unknown
  effect literal rejected.
- **Propagation:** 4-stage linear chain with high and low inputs; inhibitor
  vs no-inhibitor comparison; cycle rejection; orphan-edge rejection;
  duplicate-node rejection; isolated node defaults to `basal`.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`. No `any`. No silent
  catches. No hard-coded molecular labels. No exceptions thrown for
  expected validation failures. The cycle check is enforced and tested,
  which is the runbook-mandated invariant for this kernel.

### P1 issues

- The propagation loop allocates a fresh `Map` and recomputes incoming
  edges per node via `Array.filter`. For graphs with thousands of edges this
  becomes O(N·E); for the introductory cascades this kernel targets (a few
  tens of nodes max), it stays well under a millisecond. A future P2 could
  switch to an adjacency-list pass once a container surfaces the need.
- The boundary re-validation against forged brands adds defensive code paths
  that are unreachable through the public constructors but pay for
  themselves in audit clarity.

### P2 follow-ups (deferred)

- Add a `propagateWithTrace` that records intermediate per-node activations
  for sims that want to visualise the cascade step-by-step.
- Add `core/dynamical-systems`-backed time integration for feedback-loop
  pathways (current contract rejects cycles).
- Promote `SignalLevel` and `EdgeWeight` brand identities to `core/shared` if
  another kernel ends up needing unit-interval brands.

### High-bandwidth questions surfaced

- Should `propagate` accept caller-supplied inputs for *any* node (current
  behaviour) or only for source nodes (no incoming edges)? Current behaviour
  is more permissive and lets containers clamp a midstream node to a
  specific value for "what-if" analyses; documented in `AGENTS.md`.
- Should the activation function be configurable per node (sigmoid vs
  step vs piecewise-linear)? Today every node uses the same logistic;
  flagged as a P2 for once a container needs a step-function knockout
  example.
