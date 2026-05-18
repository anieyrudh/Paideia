# Technical Notes

## Architecture

This container has been upgraded from a content-only prerequisite into a
product-quality PMOE-T slice. The simulation surface delegates learner-facing
React UI and dimension-checking logic to `@paideia/a-level-physics-sims`, while
container-local files declare the simulation contract, controls, presets,
runtime metadata, and Playwright prediction-gate assertion.

The chosen interaction model is an impossible-equation detector. The learner
commits a prediction before seeing any verdict. After the prediction gate opens,
the lab lets the learner switch among four familiar equations and compares every
term against base dimensions M, L, and T. Matching units are presented as a
necessary check, not as a proof that the equation is true.

## Prediction-Gate Review

- The pre-commit UI is only the generic prediction form and the four answer choices.
- The verdict text, unit reasoning, repair hint, and quantity map are all children of `PredictionGate`.
- The simulation and Playwright contract both assert that the observation surface is absent before prediction commit.
- The expected answer appears in the prediction options because the learner must choose from them, but the correctness verdict and reasoning are not revealed until after commitment.

## Student-Facing Copy Review

- The UI uses learner language such as “equation”, “unit verdict”, “unit reasoning”, and “repair move”.
- It does not expose package names, kernel names, file paths, YAML terms, or implementation details.
- The technical implementation remains in README/TECHNICAL and package files, not inside the student surface.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` with `predict_at: per-sim`.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec`.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- The simulation declares `core/prediction-gate` and uses `PredictionGate` directly.
- The generated shell knowledge graph is updated by `pnpm graph:generate`.

## Failures and Fixes Recorded During Build

- Initial container state was content-only with `predict_at: none`; fixed by adding a simulation manifest, runtime files, and per-sim prediction metadata.
- The existing graph output had no simulation import for this container; fixed by regenerating the graph after updating `container.yaml`.
- `pnpm typecheck` initially found that the equation lookup could return `undefined` under `noUncheckedIndexedAccess`; fixed by adding an explicit fallback guard.
- Playwright browser binaries were missing in the environment, and `pnpm -F @paideia/a-level-shell exec playwright install chromium` was blocked by a 403 from the CDN; unit-level prediction-gate coverage remains green, while browser E2E needs a prepared Playwright cache.
- Self-review checked the answer-leak risk: post-verdict text remains gated, while multiple-choice answer labels remain visible as required prediction options.

## Anieyrudh Filter pass

Date: 2026-05-17

- P0 blockers: 0 open.
- P1 issues: 0 open.
- Pedagogy: PMOE-T is present through predict-before-reveal, manipulation by equation selection, observation through unit verdicts, explanation through term-by-term reasoning, and transfer via the unit consistency problem.
- Misconceptions targeted: unit as decoration, adding unlike quantities, and treating dimensional possibility as proof.
- Product quality: the slice is interactive, student-facing, and focused on equation validity rather than scaffold placeholders.
- Accessibility: the gate is form-based, equation selection is keyboard-accessible, verdicts are text-based, and SVG/media are fallback rather than required for the learning path.
- Verdict: pass for draft product slice; no schema, validator, or dependency weakening required.
