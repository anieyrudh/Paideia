# core/prediction-gate · agent contract

## What this module is
The prediction-checkpoint layer. It owns the React component, the persistence key scheme, and the small state machine that records a learner's prediction for any PMOE-T simulation. The simulation, visual model, formulas, controls, and readouts remain visible immediately; the checkpoint is a reflection artifact, not an access gate.

## Public interface
Exports from `@paideia/prediction-gate`:

- `<PredictionGate predict={PredictSpec} packageId={PackageId} simId={SimId | "package"} onCommit?={(p) => void}>{children}</PredictionGate>` — renders `children` immediately and places a compact prediction checkpoint after the simulation surface.
- `commitPrediction(packageId, simId, prediction: { value: unknown; rationale?: string }): KernelResult<void>`
- `isPredictionCommitted(packageId, simId): boolean`
- `isRevealed(packageId, simId): boolean` — deprecated compatibility alias for `isPredictionCommitted`.
- `clearPrediction(packageId, simId): void` — requires an explicit user gesture from the caller (e.g. "Reset prediction" button).
- `usePredictionCheckpoint(packageId, simId): { committed: boolean; prediction: PredictionEvent | null; commit: (p) => KernelResult<void>; clear: () => void }`
- `usePredictionGate(packageId, simId)` — deprecated compatibility alias that still exposes `revealed` as the committed flag.
- Storage key: `paideia.predict.<packageId>.<simId | "package">` (JSON-encoded; do not read or write directly from outside this module).

## Invariants the caller must preserve
- The caller treats `isPredictionCommitted` / `usePredictionCheckpoint().committed` as the **only** truth source for whether a prediction has been saved. It must not be used to hide the simulation.
- `commitPrediction` MUST be called with a value matching the `PredictSpec` (numeric, choice, sketch, ranked). `PredictSpec.rationale_required === true` ⇒ rationale string is non-empty after trim.
- Refresh-survival: caller MUST NOT clear localStorage on mount; commit state is the learner's, not the page's.
- `clearPrediction` MUST originate from an explicit user gesture — not auto-fired on navigation, not on error recovery.

## What this module does NOT do
- Does **not** grade the prediction. Whether the predicted value matches the eventual observation is a job for `core/sim-runtime` (Explain stage) and `core/content-schema` rubrics — this module only records commitment.
- Does **not** judge rationale quality. It records the string; the Filter and Explain-stage scaffolding interpret it.
- Does **not** sync to a server. Persistence is local; if/when a sync layer arrives, it consumes this module's storage, it does not replace it.
- Does **not** know about specific subjects (math, physics, history). `PredictSpec` carries the shape.
- Does **not** hide answers, charts, formulas, or diagrams. Quality now comes from immediate feedback plus a saved reflection checkpoint, not from withholding the model.
- Does **not** persist across browsers or devices — local-only, by design.

## When to consider this module
Use `core/prediction-gate` whenever a simulation has a Predict stage in its PMOE-T arc — which, per the Filter, is every observation-shaped simulation. The checkpoint should sit beside or below the live model so learners can compare their expectation with the visible system without losing access to the simulation.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every sim package, the sim-runtime, both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for storage-key changes (breaks existing learners' state) or for any change that breaks the checkpoint contract.

## Anti-patterns (will be rejected in PR review)
- Reading the localStorage key from outside this module.
- A `hideUntilCommit`, `bypassGate`, `previewMode`, or `instructor` prop. The simulation is always visible; there is nothing to bypass.
- Hiding children with `display: none`, opacity tricks, stage-only gates, or overlays until commit.
- Storing a prediction with `rationale: ""` when `PredictSpec.rationale_required === true`.
- Auto-clearing the gate on route change or error boundary.
- Branch-specific commit flows (`if SUTD then skip rationale`) — generalise in `PredictSpec`.

## How the Anieyrudh Filter reads this module
The Filter probes that `<PredictionGate>` never hides its children, that a prediction checkpoint remains visible before commit, and that the rationale field is required exactly when `PredictSpec` says it is. A sim that withholds the visual model until commit fails review.
