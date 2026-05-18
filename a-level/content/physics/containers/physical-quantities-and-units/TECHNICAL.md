# Technical Notes

## Architecture

This container upgrades the former content-only prerequisite into a learner-facing
measurement and uncertainty lab. The simulation renderer lives in
`@paideia/a-level-physics-sims/measurement-uncertainty` and is referenced by the
container simulation manifest. The container-level simulation entry point simply
re-exports the package renderer so the shell can mount it from generated graph
data.

The lab uses `PredictionGate` before any observation, calculation readout, or
formula reasoning enters the DOM. Learners first predict which source should set
the uncertainty, then manipulate two length readings, ruler resolution, and time.
The revealed state shows the best estimate, absolute uncertainty, derived speed,
base/derived quantity distinctions, scalar relevance for length, and dimensional
checks for valid equations.

## Validation Notes

- `container.yaml` validates against `ContainerSpec`.
- `simulation/simulation.yaml` validates against `SimulationSpec`.
- `simulation/simulation.test.ts` uses the shared prediction-gate harness.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- No GPL, AGPL, or LGPL runtime dependency was added.

## Self-review for prediction leaks

- Before commit, the DOM contains only the prediction prompt, choices, rationale field, and commit button.
- The best estimate, absolute uncertainty, speed formula, and dimensional-check cards are children of `PredictionGate` and are not rendered until the learner commits.
- Student-facing UI copy uses classroom language: reading, uncertainty, speed, unit, and equation. It does not expose package names, YAML fields, kernel names, or implementation details.

## Failures and fixes recorded during build

- Initial container state was content-only (`predict_at: none`, no `simulation/` surface). Fixed by adding the measurement lab manifests, renderer re-export, package renderer, and prediction-gate tests.
- `pnpm container:validate` initially rejected the custom `measurement-lab` interaction type. Fixed by using the schema-supported `other` interaction type while keeping the learner-facing lab title and copy specific to measurement uncertainty.
- Browser-based Playwright checks could not run in this environment because the Chromium executable was missing, and `pnpm -F @paideia/a-level-shell exec playwright install chromium` was blocked by a 403 from the Playwright CDN. Unit-level jsdom prediction-gate contracts passed, while browser harness execution remains environment-blocked.
- A visual screenshot could not be captured for the same missing-browser reason.
- The original transfer task only checked acceleration units. Fixed by replacing it with a measurement speed record that exercises value, unit, uncertainty, and dimensional consistency together.

## Anieyrudh Filter pass

Date: 2026-05-17

- P0 blocker check: PASS. The prediction gate blocks all observation and formula answers before commit; no generated authoring or implementation language appears in the learner UI.
- P0 misconception check: PASS. The lab directly targets “unit as decoration,” “quantity equals number,” and “uncertainty ignored because the calculator gives many digits.”
- P0 curriculum fit: PASS. The slice supports A-Level H2 Physics Section I foundations for SI units, base/derived quantities, scalar/vector awareness, dimensional consistency, and measurement uncertainty.
- P1 product quality check: PASS. The interaction is a coherent measurement-and-uncertainty lab rather than a scaffold demo, with presets, sliders, a visual ruler, readout cards, and equation checks.
- P1 transfer check: PASS. The transfer problem changes surface form to a trolley speed record while preserving the same value/unit/uncertainty/dimension reasoning.
- Deferred tradeoff: The uncertainty model intentionally uses a clear introductory rule—take the larger of half-range and half-smallest-division for length—rather than modelling all possible laboratory conventions.
