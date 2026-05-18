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
- The observation also states that dimensional consistency is a necessary filter,
  not proof that an equation is physically correct.

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

## Candidate Integration Review

This slice was integrated after reviewing draft candidate PRs #25-#39.

| Candidate group | Main interaction | Result | Integration decision |
| --- | --- | --- | --- |
| #25-#27 | Quantity map / dependency graph | Good graph-model direction, but full test failed because the sim was not registered in the browser harness. | Do not use as base. Keep quantity-map/dependency graph as a future companion lab once a shared dimensional-model kernel exists. |
| #28-#30 | Unit classification / card sorting | Strong practice UI ideas, but several candidates had incomplete CI or answer-feedback timing risks. | Port the learner-facing emphasis on “quantity passport” and unit-vs-number distinction into concept copy; do not merge the broad UI surface. |
| #31-#33 | Impossible-equation detector | Good equation-case library, but full test failed from missing sim-harness registration and some candidates left P1 metadata open. | Port the idea that unit checks reject impossibilities but do not prove physics. Save the richer equation case bank for a later dimensional-consistency sim. |
| #34 | Measurement and uncertainty lab | Only candidate with visible required checks all green; coherent single interaction; shell and sim-harness wiring present. | Use as the base implementation. Remove pre-gate exact-answer examples and layer in the best small ideas from other candidates. |
| #35-#36 | Measurement lab variants | Stronger repeated-reading and measurement-track ideas, but full test failed or shell tests were stale. | Port the “larger of repeat spread vs instrument resolution” principle into the uncertainty explanation; leave richer repeated-reading controls for a follow-up. |
| #37-#39 | Dimensional consistency checker | Good unit-fingerprint mental model, but browser prediction-gate contract failed and concept cards leaked exact prediction answers. | Do not use as base. Save the dimension-balance table/custom builder for a future dedicated dimensional-consistency container or second sim. |

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
| Candidate integration | #34 concept-card examples included the exact default speed record before the gate | Rewrote examples qualitatively and added a shell axe regression that checks the answer is absent before commit |
| Candidate integration | Other candidates had useful dimensional-consistency ideas but failing sim-harness or answer-leak risks | Ported the “unit check is necessary, not sufficient” principle without adding a second interaction model |

## Latest Validation

Local integration run on 2026-05-18:

- `pnpm graph:generate` passed.
- `pnpm -F @paideia/a-level-physics-sims test` passed.
- `pnpm -F @paideia/a-level-shell test` passed, including revealed-state axe coverage for this route.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm boundary` passed.
- `pnpm license:check` passed.
- `pnpm container:validate` passed.
- `pnpm test` passed.

## Anieyrudh Filter pass

Date: 2026-05-18

### P0 blockers

- **Prediction before reveal:** Pass. Observation and explanation details are gated; tests assert no notebook observation before commit.
- **Pre-gate answer leakage:** Pass. Exact default speed-record examples were removed from the concept panel, and shell tests assert the notebook/formula answer is absent before commit.
- **Schema and validator integrity:** Pass. No schema, validator, or boundary rule was weakened.
- **Student-facing copy:** Pass. The interactive surface does not expose package names, YAML tokens, test harness details, or kernel names.
- **Container shape:** Pass. The existing container was upgraded in place with canonical simulation, media, embed, problem-solving, README, and technical surfaces.

### P1 issues addressed or deferred

- **Engagement:** Addressed with a polished measurement-notebook interaction, four controls, live classification, formula reasoning, and uncertainty propagation.
- **Reusable logic boundary:** Deferred extraction to core until another container needs the same uncertainty propagation model; current logic is tested and local to the A-Level physics sims package.
- **Transfer:** Addressed by retaining the acceleration unit consistency transfer and adding measured-value uncertainty expectations.
- **Candidate merge discipline:** Addressed by using #34 as the coherent base, porting only small high-signal ideas from other candidates, and rejecting multi-model UI sprawl.

### Verdict

Approved for reviewed product-slice status with zero open P0 issues and zero open P1 issues requiring this PR to block.
