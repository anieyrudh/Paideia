# Technical Notes

## Architecture

This container upgrades the original content-only prerequisite into a prediction-gated React simulation exported from `@paideia/a-level-physics-sims/impossible-equation-detector`. The container-level `simulation/index.tsx` re-exports the package implementation so the content container owns declarations and metadata while reusable UI logic lives in the A-Level physics simulations package.

The chosen interaction model is an **impossible-equation detector**. It expands selected physical quantities into base-dimension signatures, compares terms that are added or equated, and renders a student-facing verdict. The implementation deliberately avoids showing package names, schema tokens, kernel names, or file language to learners.

## Prediction Gate

The detector uses `PredictionGate` with package id `physical-quantities-and-units` and sim id `impossible-equation-detector`. The selected equation, verdict, dimension readouts, mismatch explanation, and quantity map are children of the gate, so they do not enter the DOM until a prediction and rationale are committed.

Self-review for answer leaks:

- The pre-gate prompt states the proposed equation and asks for a prediction, but it does not render the detector verdict or dimensional breakdown.
- The correct multiple-choice option appears as a prediction choice, which is expected for a multiple-choice prediction gate; no feedback or result is shown before commit.
- The post-gate UI copy is learner-facing and avoids code, YAML, package names, and implementation details.

## Validation Notes

- `container.yaml` declares `predict_at: both`, a package-level predict prompt, and a simulation surface.
- `simulation/simulation.test.ts` contains the required `prediction-gate` contract marker.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- Kernel dependencies are limited to existing core packages: content schema types, prediction gate, and UI simulation controls.
- No runtime dependency was added.

## Failures and Fixes Recorded During Build

- The original container was `content-only`; it was upgraded in place to `draft` with a simulation declaration rather than duplicated.
- The embed state previously tracked a static selected example; it now tracks selected equation, prediction progress, and completion for the interactive detector.
- The misconception audit previously had no non-empty Filter pass; this file now records the pass below.
- `container:validate` rejected a custom `consistency-checker` interaction type; it was changed to the schema-supported `decision-matrix` type without weakening the validator.

## Anieyrudh Filter pass

Date: 2026-05-17
Scope: `a-level/content/physics/containers/physical-quantities-and-units`
Mode: critic-only review of the product slice after implementation.

### P0 blockers

- None open.

### P1 issues

- The detector uses a curated set of equations rather than free-form symbolic input. This keeps the first slice reliable and student-safe, but it limits open exploration. A future canonical version could add a constrained expression builder once a shared dimensional-analysis kernel exists.
- Shell and sim-harness Playwright tests require a browser binary that is not currently present in the environment. An attempted browser install was blocked by the CDN returning HTTP 403, so the shell test command remains environment-blocked rather than code-blocked.

### Pass notes

- PMOE-T alignment is present: learners predict before reveal, manipulate the selected equation, observe dimensional signatures and verdicts, explain the necessity of matching dimensions, and transfer the method to measurement/unit consistency tasks.
- The UI distinguishes base vs derived quantities, scalar vs vector properties where relevant, physical quantities vs units, and dimensional consistency.
- The detector states that dimensional consistency is necessary but not sufficient, preventing the overclaim that units alone prove a law.
- No answer-shaped observation is rendered before the prediction gate commits.
