# core/sim-runtime · agent contract

## What this module is
The PMOE-T orchestrator. It owns the state machine that drives a simulation through the four stages — Predict → Manipulate → Observe → Explain — and the observable store (axon) that lets child components read sim state without prop-drilling. It validates the `SimulationSpec`, mounts the embedded prediction checkpoint, and exposes hooks for child renderers. It does not implement any specific physics, math, or rendering.

## Public interface
Exports from `@paideia/sim-runtime`:

- `<SimRuntime spec={SimulationSpecT} packageId={PackageId}>{children}</SimRuntime>` — the wrapper every sim mounts inside.
- `useSimState<S>(): Readonly<S>` — read the current parameter/observable state.
- `useStage(): { current: PmoeTStage; advance: () => KernelResult<void>; reset: () => void }`
- `useTransition(): { from: PmoeTStage; to: PmoeTStage; t: number } | null` — non-null only mid-transition.
- `useManipulate<S>(): { state: Readonly<S>; set: <K extends keyof S>(k: K, v: S[K]) => void }` — only callable when stage is `'manipulate'`; throws a kernel-shaped error otherwise.
- `PmoeTStage = 'predict' | 'manipulate' | 'observe' | 'explain'`
- `SimContext<S>` — typed context object exposing the spec, the store, and the stage.

## Invariants the caller must preserve
- The runtime is the **only** writer of `PmoeTStage`. Children read; they do not set.
- Transitions go forward only: `predict → manipulate → observe → explain`. `reset()` returns to `predict`. No skipping.
- `<SimRuntime>` wraps a `<PredictionGate>` internally when `SimulationSpec.predict` is declared. The checkpoint must not hide children.
- The spec passed in MUST `SimulationSpec.parse` successfully; invalid specs render an error boundary, not a partial sim.
- State mutations during `manipulate` MUST go through `useManipulate().set`; direct ref mutation is undefined behaviour.

## What this module does NOT do
- Does **not** compute. No derivatives, no ODE steps, no random sampling. Domain math is the caller's, drawn from `core/numerical-math`, `core/function-eval`, downstream physics.
- Does **not** render. It exposes hooks; consumers render with `core/plotting`, `core/charting`, `core/three-scene`.
- Does **not** persist anything beyond what `core/prediction-gate` persists. Sim parameter state is per-session.
- Does **not** grade or compare predictions to observations — that's the Explain-stage rubric in `core/content-schema` + the caller's Explain UI.
- Does **not** know about subjects. A sim of an enzyme reaction and a sim of a recession use the same runtime.
- Does **not** drive timing/animation loops — consumers handle their own `requestAnimationFrame`; the runtime only emits state.

## When to consider this module
Use `core/sim-runtime` for every interactive simulation in the monorepo. If a piece of content has the four PMOE-T stages — and per the Filter, every observation-shaped sim does — it mounts inside `<SimRuntime>`. Static figures and one-off illustrations do not need it.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every sim package, both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to the stage machine, hook signatures, or context shape.

## Anti-patterns (will be rejected in PR review)
- Reading or writing stage state from outside the runtime (e.g. via a parallel Zustand store).
- A `hideUntilPredict`, `skipPredict`, or `instructorMode` prop. Prediction is a checkpoint, not a route lock.
- Side effects in render (data fetches, timers) — use the spec's declared lifecycle hooks.
- Calling `set` during `predict` or `observe` to "pre-warm" UI — it's an error.
- Branch-specific stages (`if SUTD add 'reflect' stage`) — PMOE-T is the contract; extending it is a `core!:` change.

## How the Anieyrudh Filter reads this module
The Filter probes that **stage transitions cannot be reordered, skipped, or driven by anything but learner action**, and that the prediction checkpoint is visible without blocking the live model. A runtime that hides observations until `predict.commit()` is rejected.
