# Physical Quantities and Units · Technical Record

## Architecture

This container is now an interactive product slice. The executable learner lab
lives in `@paideia/a-level-physics-sims/physical-quantities`, while the content
container owns the manifest, concept card, concept map, embed contract,
problem-solving flow, media, and simulation metadata.

## Interaction model chosen

Unit classification lab. The learner sorts a selected quantity as base or
derived, scalar or vector, then checks whether an equation is permitted by unit
balance.

## Imports

- `@paideia/prediction-gate`
  - `PredictionGate` keeps all observation cards and unit-balance verdicts out
    of the DOM until the learner commits a prediction.
- `@paideia/ui-sim`
  - `ControlGroup` and `Selector` provide controlled, labelled student-facing
    choices.
- `@paideia/content-schema`
  - `TPredictSpec` types the prediction prompt used by the executable sim.
- `react`
  - `useMemo` and `useState` drive local learner choices.

## SimulationSpec (frozen)

```yaml
id: unit-classification-lab
title: "Unit Classification Lab"
interaction_type: decision-matrix
kernel_deps:
  - core/prediction-gate
  - core/ui-sim
```

The unit cards and equation checks are branch-specific A-Level examples. They
are kept in the A-Level sim package rather than inline in the content container.
If multiple containers need a general symbolic dimensional-analysis engine, the
future home should be a dedicated core kernel proposed through ADR.

## Prediction-gate self-review

- Before commit, only the prediction prompt, choices, and rationale field render.
- The observed quantity card uses `aria-label="Observation unlocked"` and is a
  child of `PredictionGate`.
- The default equation verdict and corrected acceleration unit are not mounted
  before the gate opens.
- The prediction choices include plausible diagnoses, but no post-gate verdict,
  formula balance, or correction explanation is revealed before commitment.

## Student-facing copy review

The UI uses learner-facing language: “quantity card”, “unit balance”, “units
agree”, and “units clash”. It does not show filenames, YAML tokens, package
names, kernel names, or implementation architecture.

## Anieyrudh Filter pass

Date: 2026-05-17
Reviewers: local container audit, local sim-architecture audit, local pedagogy audit
Filter version: aniegpt v1.0

### P0 resolved

- Prediction-before-reveal — resolved: `PredictionGate` wraps the full lab, and
  both jsdom and content-level browser contract tests assert observation is
  blocked before commit.
- Answer leakage — resolved: post-gate unit balances, verdict chips, and
  corrected acceleration unit reasoning are not mounted before commitment.
- Student UI exposure — resolved: UI copy avoids implementation details and
  presents cards, classifications, and equations only.
- Container completeness — resolved: manifest, concept card, concept map,
  simulation, embed, media, problem-solving, README, and TECHNICAL surfaces are
  present.

### P1 addressed or deferred

- General dimensional-analysis kernel — deferred: this version uses a small,
  explicit A-Level card set. A core symbolic unit kernel should be proposed only
  after at least one more container needs open-ended dimensional algebra.
- Human advisor sign-off — deferred: `advisor_signoffs` remains empty until a
  Physics reviewer approves the copy and examples.
- Browser screenshot — deferred in this environment if Playwright Chromium is
  unavailable; the runnable app should be screenshot in CI or a local browser
  environment.

### P2 noted

- The interaction optimizes conceptual sorting over free-form equation entry.
  That is intentional for v1 because it reduces noise while learners are still
  separating quantity, value, unit, and dimension.

## Failure and fixes log

| Attempt | Failed where | Symptom | Fix or disposition |
| --- | --- | --- | --- |
| Initial scope check | `.agents/skills/build-product-container/SKILL.md` | Requested skill file was not present in this checkout. | Followed `docs/container-spec.md`, existing container patterns, and product requirements directly. |
| Prediction leak self-review | lab default state | The default selected equation is the acceleration mistake, so the correction must be gated. | Kept the entire lab inside `PredictionGate`; tests assert the observation panel is absent before commit. |
| Browser shell test | `pnpm -F @paideia/a-level-shell test` | Playwright could not launch because Chromium was not installed in `/root/.cache/ms-playwright/...`. | Environment limitation; rerun after browser installation succeeds. |
| Browser install | `pnpm -F @paideia/a-level-shell exec playwright install chromium` | Playwright CDN returned HTTP 403 for Chromium v1223. | Environment limitation; CI or a network with CDN access should install the browser. |
| Full workspace test | `pnpm test` | Unit and jsdom suites passed through the new physics sim tests, then shell and sim-harness Playwright tests failed because Chromium was missing. | Environment limitation; rerun after Playwright Chromium is available. |

## Known tradeoffs

- This version should become canonical if Paideia wants the first prerequisite
  slice to teach “units constrain equations” through quick, concrete sorting.
- It should not become canonical if the desired first product slice is a
  measurement uncertainty lab or a free-form dimensional algebra checker.
