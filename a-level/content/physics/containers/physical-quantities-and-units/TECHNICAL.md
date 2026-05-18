# Technical Notes

## Architecture

This container has been upgraded from content-only into a reviewed product slice
using a **dimensional consistency checker** interaction model.

- The learner-facing React surface lives in `@paideia/a-level-physics-sims/physical-quantities` and is re-exported from `simulation/index.tsx`.
- The simulation uses `PredictionGate` before rendering the equation audit, verdict, dimension bars, or formula reasoning.
- The reusable pure logic is separated from JSX in the physics sim package: `evaluateEquation`, `formatDimension`, and related dimension-vector helpers power both the UI and tests.
- The checker intentionally uses a small curated set of equations instead of a symbolic parser so the slice remains focused on first-principles unit reasoning rather than syntax entry.
- Styling is app-level and student-facing; the UI names equations, units, quantities, and reasoning steps without exposing package names, schema fields, or kernel internals.

## Interaction Model

Learners predict which proposed equation fails a unit check. After commitment,
they can select among:

1. `v = s / t`, which passes as `L T^-1` on both sides.
2. `F = ma`, which passes because `N = kg m s^-2`.
3. `s = vt + 1/2 at`, which fails because `at` is `L T^-1`, not a length.

The observation layer makes calculations visible through base-dimension bars and
a concise reasoning trace. The explain layer asks learners to connect the unit
mismatch to the principle that only like dimensions can be added or equated.

## Prediction-Gate / Answer-Leak Review

Self-review result: no answer leak before commitment.

- Pre-gate UI is only the generic prediction form rendered by `PredictionGate`.
- The verdict strings, equation audit cards, formula panel, dimension bars, and fix hint are children of `PredictionGate` and do not enter the DOM until the learner commits.
- The shell sidebar may show the prediction prompt, but not the verdict or the correction.
- The multiple-choice option list necessarily includes the candidate equations; it does not mark the correct answer before commitment.

## Student-Facing Copy Review

- UI copy uses learner language: "Choose an equation to audit", "Units reject this equation", "Only like dimensions can be added or equated."
- Student UI does not mention YAML, package names, generated graph files, kernels, or attached-file language.
- Technical implementation details are limited to this file and runtime manifests.

## Validation Notes

- `container.yaml` declares `simulation`, `reasoning-lab`, `misconception-audit`, and `transfer-problem` aid types.
- `simulation/simulation.yaml` declares a per-sim prediction prompt and renderer module.
- `container.yaml` also declares a package-level prediction so the shell brief and reset behavior stay aligned with the simulation.
- `concept-map/concept-map.yaml` keeps existing downstream links and adds planned kinematics as the next unit-sensitive application.
- The embed API still exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.

## Failures and Fixes Recorded

- Initial implementation risk: the selector test attempted to set the semantic challenge id, but the shared `Selector` component stores option indexes in the DOM. The contract test was updated to select the first option by index while keeping learner labels visible.
- Initial product risk: the original container status was `content-only` with `predict_at: none`. The manifest was upgraded to `reviewed`, `predict_at: both`, and a reviewed Filter record so validators treat the prediction-gated simulation as part of the canonical container.
- Initial pedagogy risk: the concept card explained units but did not explicitly foreground term-by-term dimensional consistency. It now includes dimensional consistency definitions, examples, and a lab section.
- Validator failure: `concept-map/concept-map.yaml` originally used a downstream relationship sentence over the 120-character schema limit. The relationship was shortened without changing the graph meaning.
- Environment limitation: Playwright Chromium was absent. An attempted `pnpm -F @paideia/a-level-shell exec playwright install chromium` failed with HTTP 403 from the Playwright CDN, so browser-based shell tests and screenshots could not run in this container until the browser cache is provisioned.

## Anieyrudh Filter pass

Date: 2026-05-17

- **P0 — prediction gate:** Pass. The dimensional verdict, reasoning trace, and correction are blocked by `PredictionGate` until the learner commits a prediction.
- **P0 — schema/container shape:** Pass. The canonical simulation, embed, media, concept map, and problem-solving surfaces are present and declared.
- **P0 — student UI safety:** Pass. Learner-facing UI avoids implementation details and does not expose schema/package terminology.
- **P1 — misconception surfacing:** Pass. The predict prompt elicits "unit as decoration" and "dimension mismatch" misconceptions, and the explain stage directly addresses them.
- **P1 — product quality:** Pass with tradeoff. The slice is polished and focused, but intentionally uses curated equations rather than free-form symbolic parsing to avoid parser complexity in the first product version.
- **Deferred improvement:** Add a later core dimensional-analysis kernel if additional containers need arbitrary unit algebra beyond this curated A-Level physics slice.
