# Technical Notes

## Architecture

The container now uses a measurement and uncertainty lab as its single coherent
interaction model. Executable React code lives in `@paideia/a-level-physics-sims`
so the content container keeps only declarative simulation surfaces and a thin
route-facing re-export.

- `PredictionGate` wraps the lab, so the notebook, formula reasoning, and final complete record do not enter the DOM until prediction commit.
- `@paideia/ui-sim` supplies learner-facing sliders for measured distance, distance uncertainty, measured time, and time uncertainty.
- The sim computes speed as distance divided by time and combines percentage uncertainties for the quotient.
- The observation explicitly classifies distance and time as base scalar quantities and speed as a derived scalar quantity.
- Unit reasoning is shown as student-facing notebook language: `m ÷ s` becomes `m s^-1`; `m + s` is flagged as an impossible speed unit.

## Simulation Contract

```yaml
id: measurement-uncertainty-lab
interaction_type: decision-matrix
kernel_deps:
  - core/prediction-gate
  - core/ui-sim
```

The lab intentionally does not introduce a separate uncertainty kernel in this
slice. The calculation is small, local to the A-Level measurement interaction,
and exposed through tested pure functions in the physics sims package. If later
containers need repeated uncertainty propagation across domains, that logic
should move to a shared core kernel instead of being duplicated.

## Prediction-Gate Self-Review

- The complete notebook record is rendered only inside the `PredictionGate` child tree.
- The pre-commit prediction screen shows answer choices but does not mark the correct choice or display the formula reasoning.
- The sim test asserts that `[aria-label='Observation unlocked']` is absent before commit.
- The Playwright harness contract also checks for the post-commit notebook text.

## Student UI Copy Review

- UI copy uses learner-facing terms: measurement record, notebook, distance, time, speed, unit reasoning, uncertainty.
- UI copy does not mention package names, YAML, kernels, DOM, tests, or implementation files.
- Technical implementation terms remain in this `TECHNICAL.md` file only.

## Product-Slice Quality Review

- The interaction is app-like rather than a scaffold: learners manipulate four measured inputs and receive live, contextual reasoning.
- The lab connects the first container to later vector work by explicitly separating scalar speed from vector quantities while preserving unit discipline.
- The default state uses realistic classroom-sized values: `2.00 ± 0.02 m` and `0.80 ± 0.02 s`.
- The visual media and README now match the measurement-and-uncertainty lab instead of a content-only unit check.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` with `status: reviewed`.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares a sim-level predict prompt.
- The embed API still exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- No GPL, AGPL, or LGPL runtime dependency was added.

## Failures and Fixes Recorded

| Check | Failure observed | Fix |
| --- | --- | --- |
| Initial product review | Existing container was content-only and had no prediction-gated simulation | Added `measurement-uncertainty-lab`, updated `container.yaml`, and supplied all required simulation surfaces |
| Answer-leak self-review | Complete speed notebook would be an answer leak if rendered outside the gate | Kept notebook and formula panels inside `PredictionGate`; added unit tests that assert the observation is absent before commit |
| Container coherence review | Original problem-solving flow omitted uncertainty and scalar/vector classification | Updated algorithm, steps, concept card, and transfer rubric to include uncertainty and classification decisions |
| `pnpm -F @paideia/a-level-shell test` | Playwright Chromium executable was missing from `/root/.cache/ms-playwright` | Attempted `pnpm --dir a-level/apps/shell exec playwright install chromium`; download was blocked by upstream 403, so shell E2E remains environment-blocked rather than code-failing |
| `pnpm test` | Workspace tests reached Playwright packages and failed for the same missing Chromium executable | Unit tests, typecheck, lint, boundary, license, graph generation, and container validation pass; Playwright browser install is the remaining environment limitation |

## Anieyrudh Filter pass

Date: 2026-05-17

### P0 blockers

- **Prediction before reveal:** Pass. Observation and explanation details are gated; tests assert no notebook observation before commit.
- **Schema and validator integrity:** Pass. No schema, validator, or boundary rule was weakened.
- **Student-facing copy:** Pass. The interactive surface does not expose package names, YAML tokens, test harness details, or kernel names.
- **Container shape:** Pass. The existing container was upgraded in place with canonical simulation, media, embed, problem-solving, README, and technical surfaces.

### P1 issues addressed or deferred

- **Engagement:** Addressed with a polished measurement-notebook interaction, four controls, live classification, formula reasoning, and uncertainty propagation.
- **Reusable logic boundary:** Deferred extraction to core until another container needs the same uncertainty propagation model; current logic is tested and local to the A-Level physics sims package.
- **Transfer:** Addressed by retaining the acceleration unit consistency transfer and adding measured-value uncertainty expectations.

### Verdict

Approved for reviewed product-slice status with zero open P0 issues and zero open P1 issues requiring this PR to block.
