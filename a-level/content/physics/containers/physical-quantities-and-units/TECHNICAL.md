# Technical Notes

## Architecture

This container has been upgraded from content-only to a prediction-gated
interactive lab. The learner-facing simulation lives in the shared A-Level
physics simulations package and is re-exported by `simulation/index.tsx` so the
container stays a product surface rather than a place for reusable logic.

The chosen interaction model is an **impossible-equation detector**. Its pure
model expands familiar A-Level quantities into base SI dimensions, checks
addition before equality, and then applies a scalar/vector direction check.

## Prediction Gate

The detector is wrapped in `PredictionGate`. Before a learner commits a choice
and rationale, the verdict, unit expansion, and explanation panels do not enter
the DOM. The default card after reveal is the common trap, `distance = speed +
acceleration`, but that answer is not shown in learner-facing UI before commit.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` and declares simulation, embed, concept-map, and problem-solving surfaces.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares a sim-level prediction.
- `simulation/simulation.test.ts` contains the required prediction-gate contract marker.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- No new runtime dependency was added.

## Self-Review

- Answer leak check: the pre-reveal DOM contains the prediction prompt and choices only; detector verdict text appears only after `PredictionGate` commits.
- Student-facing copy check: labels say “Unit detective lab”, “Equation to test”, and “Rule of the lab”; there are no package names, YAML names, or kernel names in the learner UI.
- Product-slice check: the sim includes multiple equation cards, visible dimensional reasoning, a scalar/vector trap, and a concise transfer rule rather than a scaffold placeholder.

## Failures and Fixes Recorded

- Initial design used a generic `select` control label in the simulation spec; it was corrected to the schema-supported `selector` kind.
- The selector contract test originally tried to set the option value by equation id; it was corrected to use the index values emitted by the shared UI selector.
- Playwright browser installation is blocked in this environment by a 403 response from the browser CDN, so shell and harness browser tests could not execute here. The jsdom prediction-gate tests cover the new detector gate locally, and the browser commands should be rerun in CI with browsers installed.

## Anieyrudh Filter pass

- Date: 2026-05-17
- Scope: physical-quantities-and-units product-slice upgrade.
- P0 issues: 0 open.
- P1 issues: 0 open; scalar/vector direction nuance added as a follow-up misconception to prevent “units match, therefore true” overclaim.
- Verdict: pass for reviewed status. The package preserves predict-before-reveal, keeps reusable detector logic in the shared A-Level physics sim package, avoids implementation details in student copy, and teaches dimensional consistency without claiming it proves equations true.
