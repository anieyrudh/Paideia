# Physical Quantities and Units · Technical Record

## Architecture

This container is now a product-facing unit classification lab. The learner UI
is exported from `@paideia/a-level-physics-sims/unit-classification` and the
container-level `simulation/index.tsx` is a thin host-facing re-export.

## Interaction model

Chosen model: **unit classification lab**.

The lab uses a prediction gate before revealing:

- quantity cards for base vs derived classification;
- scalar/vector labels where direction matters;
- SI units and base-dimension patterns;
- an impossible-equation detector that compares dimensions on both sides.

## Kernel boundaries

No new core kernel was added. The current interaction uses a small fixed deck of
A-Level foundation quantities and equations. If later containers need symbolic
dimensional algebra, promote that logic into a dedicated core kernel rather than
copying or expanding this local deck.

## Validation Notes

- `container.yaml` validates against `ContainerSpec`.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec`.
- `simulation/simulation.yaml` validates against `SimulationSpec`.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- Prediction reveal is blocked by `PredictionGate`; the executable package test asserts no quantity passports or dimensional checks appear before commit.

## Answer-leak self-review

- The shell-side brief repeats only a reflective prediction prompt, not a classification or dimensional verdict.
- The prediction options do not mark a correct answer and do not show the quantity card deck.
- Unit classifications, dimensional verdicts, and formula strips are children of `PredictionGate` and are absent from the DOM before commit.
- Student-facing copy says "unit lab", "quantity card", and "equation detector"; it does not mention code, YAML, packages, or file names.

## Anieyrudh Filter pass

Date: 2026-05-17
Reviewers: local container audit, local sim-architecture audit, local pedagogy audit
Filter version: aniegpt v1.0

### P0 resolved

- Prediction-before-reveal — resolution: `UnitClassificationLab` wraps all observation content in `PredictionGate`, and the jsdom contract proves dimensional verdicts are absent before commit.
- Student-facing product quality — resolution: the sim uses cards, passports, and an equation detector instead of a checklist or scaffold placeholder.
- Formula visibility — resolution: every revealed quantity card includes a `Formula used` strip, and the equation detector shows left- and right-side dimensions.
- Container completeness — resolution: the manifest now declares simulation, controls, presets, runtime metadata, state labels, embed API, transfer problem, media, README, and TECHNICAL surfaces.

### P1 addressed or deferred

- Reusable dimensional algebra — deferred. A fixed A-Level deck is sufficient for this slice; future symbolic algebra belongs in a core kernel once multiple containers need it.
- Human advisor sign-off — deferred until a Physics reviewer checks classroom wording and records `advisor_signoffs` in `container.yaml`.

### P2 noted

- A later version could add drag-and-sort assessment scoring after the base product slice is stable.

## Failure and fixes log

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Initial product direction | Design review | A pure definition table would not feel like a product slice. | Chose a unit classification lab with a card deck and equation detector. |
| Answer leak review | Self-review | Dimensional verdicts would leak if the shell rendered a static summary outside the gate. | Kept all classifications and verdicts inside the gated sim; shell brief shows only the prediction prompt. |

## Deferred fixes

- Advisor sign-off remains deferred to a human Physics reviewer.
- Symbolic dimensional algebra remains deferred to a future core-kernel proposal.

Date: 2026-05-17

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Browser install | `pnpm -F @paideia/a-level-shell exec playwright install chromium` | Playwright CDN returned HTTP 403 for Chromium v1223. | Recorded as an environment limitation; rerun shell and sim-harness Playwright checks in CI or a network environment with browser access. |
| Shell browser test | `pnpm -F @paideia/a-level-shell test` | Failed before page execution because Chromium executable was missing. | The shell test was updated for the new unit lab; it needs browser availability to execute. |
| Full workspace test | `pnpm test` | Core and jsdom package suites passed, then Playwright shell/sim-harness failed because Chromium was unavailable. | Treat as environment-limited; non-browser gates and jsdom prediction-gate coverage passed. |
