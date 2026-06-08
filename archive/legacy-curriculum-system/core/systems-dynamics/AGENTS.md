# core/systems-dynamics - agent contract

## What this module is

Pure stock-flow systems modeling helpers. It owns validated stock-flow model
specs, simulation state, deterministic Euler stepping, and time-series output
for conceptual systems dynamics simulations.

This package computes model evidence. Diagrams, notebooks, UI controls, model
authoring, equation parsing, and stochastic simulation live elsewhere.

## Public interface

Exports from `@paideia/systems-dynamics`:

- `SystemVariableId = Brand<string, "SystemsDynamics.VariableId">`
- `StockSpec = { id: SystemVariableId; label: string; initial: number; min?: number; max?: number }`
- `FlowSpec = { id: SystemVariableId; label: string; source?: SystemVariableId; target?: SystemVariableId; rate: (state: SystemState, t: number) => number }`
- `AuxiliarySpec = { id: SystemVariableId; label: string; compute: (state: SystemState, t: number) => number }`
- `SystemModel = { stocks: readonly StockSpec[]; flows: readonly FlowSpec[]; auxiliaries?: readonly AuxiliarySpec[] }`
- `SystemState = Readonly<Record<string, number>>`
- `TimePoint = { t: number; state: SystemState }`
- `SimulationSpec = { dt: number; duration: number }`
- `systemVariableId(value: string): KernelResult<SystemVariableId>`
- `validateSystemModel(model: SystemModel): KernelResult<SystemModel>`
- `initialState(model: SystemModel): KernelResult<SystemState>`
- `evaluateAuxiliaries(model: SystemModel, state: SystemState, t: number): KernelResult<SystemState>`
- `stepEuler(model: SystemModel, state: SystemState, t: number, dt: number): KernelResult<SystemState>`
- `simulateSystem(model: SystemModel, spec: SimulationSpec): KernelResult<readonly TimePoint[]>`

## Invariants the caller must preserve

- Variable ids are non-empty trimmed strings with no whitespace and are not
  reserved object keys such as `__proto__`, `prototype`, or `constructor`.
- Stock, flow, and auxiliary ids are unique across the model.
- Stock initial values and optional bounds are finite; `min <= initial <= max`
  when bounds are present.
- Flows may have a source, a target, or both, but not neither.
- Flow endpoints must refer to existing stocks.
- Rate and auxiliary functions must be deterministic for the same state and
  time and must return finite numbers.
- `dt` and `duration` are finite positive numbers.
- Simulation duration must be an integer multiple of `dt` within tolerance.
- State inputs include every stock value and finite numbers only.
- Stock bounds are enforced after each step.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)` for non-finite computed
trajectories.

## What this module does NOT do

- Does not parse equations from strings.
- Does not render stock-flow diagrams.
- Does not choose model parameters for a subject.
- Does not solve stiff ODEs or adaptive integration; use `core/dynamical-systems`
  for richer ODE solvers.
- Does not run stochastic simulation.
- Does not persist learner state or telemetry.
- Does not include branch-specific defaults.

## When to consider this module

Use `core/systems-dynamics` when a container needs a causal stock-flow model:
population, inventory, queues at a conceptual level, feedback loops, adoption,
or depletion. If the model is a general ODE phase portrait, use
`core/dynamical-systems`; if it is a queueing formula, use
`core/queueing-systems`.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current model consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for integration-method, state-shape, or bounds-semantic changes.

## Anti-patterns (will be rejected in PR review)

- Hidden global mutable model registries.
- Silently clamping invalid initial values instead of returning an error.
- Treating missing state variables as zero.
- Running unbounded stochastic randomness inside deterministic simulation.
- Mutating the state object inside rate or auxiliary callbacks.
- Branch-specific parameter defaults.
- Catching rate-function failures and continuing.

## How the Anieyrudh Filter reads this module

The Filter probes that causal feedback is visible and honest. A stock-flow sim
must show which flows changed each stock and must not hide numerical instability
or missing state as a valid trajectory.
