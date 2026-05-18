# Technical Notes

## Architecture

This container has been upgraded from content-only to a product-quality draft
interactive slice. The executable React surface lives in
`@paideia/a-level-physics-sims/measurement-uncertainty`; the container-level
`simulation/index.tsx` is a thin route-facing re-export. The interaction model
is a measurement and uncertainty lab rather than a general unit quiz, so every
control changes a physical reading or uncertainty that feeds the same worked
calculation.

The lab uses `PredictionGate` at the sim root. Before a learner commits the
prediction, the calculated average speed, unit chain, uncertainty propagation,
and dimensional consistency cards are not mounted. After commitment, learners
can manipulate distance, timing, and uncertainty sliders and observe the unit
and uncertainty reasoning update together.

Reusable platform logic comes from:

- `core/prediction-gate` for predict-before-reveal enforcement.
- `core/shared` for branded SI boundary types (`Metres`, `Seconds`) in the sim calculation model.

No schema, validator, or boundary rule was weakened. No new runtime dependency
was added.

## Simulation Contract

```yaml
id: measurement-uncertainty-lab
title: Measurement and Uncertainty Lab
interaction_type: other
predict: average-speed unit prediction
manipulate: distance, distance uncertainty, time, time uncertainty
observe: SI conversion, speed calculation, unit chain, uncertainty propagation, dimensional checks
explain: why units constrain valid equations
```

## Answer-Leak Review

- The prediction prompt asks only for the expected unit of average speed.
- The pre-commit UI is owned by `PredictionGate`; the lab's observation section is a child of the gate and is absent from the DOM until commitment.
- The executable regression test asserts that `Formula used` and `m / s =` are not present before the gate is committed.
- Student-facing UI copy avoids package names, YAML paths, kernel names, and implementation details.

## Validation Notes

- `container.yaml` now declares `simulation`, `simulation` aid type, `predict_at: per-sim`, and interactive capabilities.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares a sim-level predict block.
- The container keeps the standard embed API methods: `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- The generated shell knowledge graph is updated by `pnpm graph:generate`.

## Failures and Fixes During Build

| Attempt | Command or check | Failure | Fix |
| --- | --- | --- | --- |
| Initial implementation planning | Container inspection | The target was content-only and had no `simulation/` surface | Added the canonical simulation files in the existing container instead of duplicating the container |
| Prediction-gate risk review | Self-review | Unit reasoning could leak if calculations were rendered beside the prediction prompt | Wrapped the entire lab in `PredictionGate` and added a regression assertion for hidden formula text |
| Product-copy review | Self-review | Technical labels would be inappropriate for learners | Kept package names and schema language in technical docs only; UI copy speaks as a measurement bench |
| Container validation | `pnpm container:validate` | The sim prediction options `m` and `s` were too short for `SimulationSpec` option labels | Changed distractors to student-readable `metre (m)` and `second (s)` while keeping `m s^-1` as the target answer |
| Browser E2E setup | `pnpm -F @paideia/a-level-shell test` and `pnpm test` | Playwright Chromium was not installed in the environment | Tried `pnpm -F @paideia/a-level-shell exec playwright install chromium`; the CDN returned 403, so browser-based checks remain environment-blocked while jsdom gate tests pass |

## Anieyrudh Filter pass

Date: 2026-05-17

- **P0 — Prediction before reveal:** Pass. The lab mounts calculated speed, unit reasoning, uncertainty propagation, and dimensional checks only inside `PredictionGate`; tests assert these are hidden before commitment.
- **P0 — Container shape:** Pass. The upgrade uses the canonical simulation, embed, media, problem-solving, concept-map, README, and TECHNICAL surfaces.
- **P0 — Student UI safety:** Pass. Learner-facing copy avoids implementation details and does not mention package names, YAML tokens, schemas, kernels, or attached files.
- **P1 — Pedagogy:** Pass. The lab follows Predict → Manipulate → Observe → Explain by eliciting the speed-unit misconception, allowing measurement manipulation, showing calculated consequences, and transferring to dimensional consistency.
- **P1 — Reuse boundaries:** Pass. The sim consumes `core/prediction-gate` and `core/shared`; no reusable kernel was inlined or added unnecessarily.
- **P1 — Product quality:** Pass with tradeoff. The interaction is focused and polished for the first slice; it intentionally stays to one-dimensional average speed rather than expanding into a full practical-skills notebook.

Open issues: none.
