# core/prediction-gate · agent contract

## What this module is
The Predict-before-reveal enforcement layer. It owns the React component, the persistence key scheme, and the small state machine that gates the Observe stage of any PMOE-T simulation behind a committed prediction. If a learner has not committed a prediction (and rationale where required), no downstream module is allowed to reveal an answer-shaped artefact for that sim.

## Public interface
Exports from `@paideia/prediction-gate`:

- `<PredictionGate predict={PredictSpec} packageId={PackageId} simId={SimId | "package"} onCommit?={(p) => void}>{children}</PredictionGate>` — wraps the Observe/Explain UI; renders the prediction form first, then `children` after commit.
- `commitPrediction(packageId, simId, prediction: { value: unknown; rationale?: string }): KernelResult<void>`
- `isRevealed(packageId, simId): boolean`
- `clearPrediction(packageId, simId): void` — requires an explicit user gesture from the caller (e.g. "Reset prediction" button).
- `usePredictionGate(packageId, simId): { revealed: boolean; commit: (p) => KernelResult<void>; clear: () => void }`
- Storage key: `paideia.predict.<packageId>.<simId | "package">` (JSON-encoded; do not read or write directly from outside this module).

## Invariants the caller must preserve
- The caller treats `isRevealed` as the **only** truth source for whether observation may proceed. No parallel "reveal" flag elsewhere.
- `commitPrediction` MUST be called with a value matching the `PredictSpec` (numeric, choice, sketch, ranked). `PredictSpec.rationale_required === true` ⇒ rationale string is non-empty after trim.
- Refresh-survival: caller MUST NOT clear localStorage on mount; commit state is the learner's, not the page's.
- `clearPrediction` MUST originate from an explicit user gesture — not auto-fired on navigation, not on error recovery.

## What this module does NOT do
- Does **not** grade the prediction. Whether the predicted value matches the eventual observation is a job for `core/sim-runtime` (Explain stage) and `core/content-schema` rubrics — this module only records commitment.
- Does **not** judge rationale quality. It records the string; the Filter and Explain-stage scaffolding interpret it.
- Does **not** sync to a server. Persistence is local; if/when a sync layer arrives, it consumes this module's storage, it does not replace it.
- Does **not** know about specific subjects (math, physics, history). `PredictSpec` carries the shape.
- Does **not** expose a "preview" or "instructor bypass" — there is no skip path. An instructor demo authors a separate sim without a Predict stage.
- Does **not** persist across browsers or devices — local-only, by design.

## When to consider this module
Use `core/prediction-gate` whenever a simulation has a Predict stage in its PMOE-T arc — which, per the Filter, is every observation-shaped simulation. If you are about to render an answer, a graph that betrays an answer, or a numeric readout that betrays an answer, this module's gate must wrap it.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every sim package, the sim-runtime, both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for storage-key changes (breaks existing learners' state) or for any change that could let a caller render before commit.

## Anti-patterns (will be rejected in PR review)
- Reading the localStorage key from outside this module.
- A `bypassGate` / `previewMode` / `instructor` prop — there is no bypass.
- Pre-revealing children with `opacity: 0` then fading in on commit (the answer is in the DOM = it's revealed).
- Storing a prediction with `rationale: ""` when `PredictSpec.rationale_required === true`.
- Auto-clearing the gate on route change or error boundary.
- Branch-specific commit flows (`if SUTD then skip rationale`) — generalise in `PredictSpec`.

## How the Anieyrudh Filter reads this module
The Filter probes that **no DOM mutation under `<PredictionGate>` exposes an observation-shaped artefact until `isRevealed` returns true**, and that the rationale field is required exactly when `PredictSpec` says it is. A sim that visually leaks the answer before commit — even via a blurred preview — fails review.
