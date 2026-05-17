# @paideia/sim-runtime · Technical Record

## Imports

| Module | Symbols |
|---|---|
| `@paideia/content-schema` | `SimulationSpec`, `TSimulationSpec` |
| `@paideia/prediction-gate` | `PredictionGate` |
| `@paideia/shared` | `ConceptPackageId`, `KernelError`, `KernelResult`, `ok`, `err` |
| `react` | context and hook primitives |

## Runtime Contract

`SimRuntime` validates the provided `SimulationSpec` before mounting children. Invalid specs render a blocking `role="alert"` runtime error, so no partial simulation UI can mount against an invalid contract.

The stage controller is intentionally narrow. `advance()` can only move to the next stage in the fixed PMOE-T order, and returns a `KernelResult<void>`. Calling `advance()` at `explain` returns `precondition-violated`. `reset()` returns to `predict`, clears the active transition, and clears per-session runtime state.

## Prediction Gate

Observe and explain children are wrapped internally with `PredictionGate`, scoped by `packageId` and `spec.id`. When a valid schema omits sim-level `predict`, the runtime blocks observe/explain rendering with an alert instead of revealing children. This preserves the predict-before-reveal invariant without inventing fallback prediction content.

## State Store

The runtime state store starts empty and is deeply frozen before exposure through hooks. `useManipulate<S>()` is the only writer surface. It throws a `KernelError`-shaped object with `code: "precondition-violated"` when called outside the `manipulate` stage.

State values must be JSON-like snapshots: primitives, arrays, and plain objects. Mutable built-ins such as `Map`, `Set`, and `Date` are rejected at the writer boundary because `Object.freeze()` does not freeze their internal slots.

## Tests

- Invalid `SimulationSpec` render blocks children.
- Stage transitions move in order and do not advance after `explain`.
- Retained `advance()` closures still read the current stage and cannot replay older transitions.
- `reset()` returns to `predict` and clears runtime state.
- `useManipulate()` is rejected outside `manipulate`.
- Nested state is cloned/frozen, and mutable built-ins are rejected.
- Transition snapshots clear after the transition window.
- Observe children are gated by `PredictionGate`.
- Missing sim-level predict blocks observe rather than bypassing the gate.

## Anieyrudh Filter pass

- P0 issues + resolution: resolved retained-stage replay by making `advance()` read a current-stage ref; observe/explain remain gated by `PredictionGate`.
- P1 issues + resolution: runtime state is now JSON-like only, cloned before storage, deeply frozen before exposure, and mutable built-ins are rejected at `useManipulate().set`.
- High-bandwidth questions surfaced: if future sims need richer state values, add explicit serialisers at the sim boundary rather than storing mutable class instances in `SimRuntime`.
