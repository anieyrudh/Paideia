# Physical Quantities and Units · Technical Record

## Architecture

This version upgrades the container from content-only to a product-quality,
prediction-gated simulation slice. The chosen interaction model is a unit
classification lab: learners sort measurement cards, identify scalar/vector
status where relevant, and inspect unit reasoning for equation checks.

## Runtime surfaces

- `simulation/index.tsx` re-exports the executable React surface from
  `@paideia/a-level-physics-sims/physical-quantities-lab`.
- `simulation/simulation.yaml` declares `unit-classification-lab` as a
  comparative-matrix interaction with `core/prediction-gate` as its kernel
  dependency.
- `a-level/packages/physics-sims/src/physical-quantities-lab.tsx` owns the
  branch-specific UI and card data for this version.
- `embed/` remains a host API surface for load/save/score/resume/theme/destroy.

## Prediction gate and answer-leak self-review

- The prediction prompt asks for a first judgement about an acceleration record.
- Before the gate is committed, the card wall, formula panel, lab score, and
  impossible-equation detector are not mounted in the DOM.
- The prompt options do not mark the correct response visually before commit;
  the post-commit lab explains the reasoning through measurement cards.
- Student-facing copy avoids filenames, package names, YAML keys, and internal
  architecture.

## Formula and unit reasoning

The lab displays reasoning such as:

- `speed = distance ÷ time, so unit = m ÷ s = m s^-1`
- `acceleration = change in velocity ÷ time, so unit = (m s^-1) ÷ s = m s^-2`
- `force = mass × acceleration, so unit = kg × m s^-2 = kg m s^-2 = N`

The equation detector compares left and right units so learners see why units
constrain valid equations rather than decorating answers afterward.

## Tests

- Container validation: `pnpm container:validate`
- Generated graph: `pnpm graph:generate`
- Sim package: `pnpm -F @paideia/a-level-physics-sims test`
- Shell route: `pnpm -F @paideia/a-level-shell test`
- Workspace checks: `pnpm typecheck`, `pnpm lint`, `pnpm boundary`,
  `pnpm license:check`, `pnpm test`

## Anieyrudh Filter pass

Date: 2026-05-17
Reviewers: local container audit, local sim-architecture audit, local pedagogy audit
Filter version: aniegpt v1.0

### P0 resolved

- Prediction-before-reveal — resolution: `UnitClassificationLab` wraps all card
  sorting, formula reasoning, score, and equation checks in `PredictionGate`,
  and both jsdom and content-level Playwright contracts assert observation is
  absent before commit.
- Content-only status for product slice — resolution: `container.yaml` now
  declares simulation capability, per-sim prediction, simulation files, and a
  reviewed filter pass.
- Student UI leaking implementation details — resolution: learner copy uses
  lab/card/equation language only; internal package and file paths appear only
  in technical documentation.

### P1 addressed or deferred

- Dedicated dimensional-analysis core kernel — deferred because this version is
  a small classification lab with fixed A-Level card data. Promote reusable unit
  algebra to `core/` only when more containers need symbolic dimension math.
- Human advisor sign-off — deferred until a physics reviewer checks classroom
  sequencing and wording.

### P2 noted

- The lab optimizes for conceptual classification rather than open-ended unit
  algebra. A later version could add typed equations once a core dimension
  kernel exists.

## Failure and fix log

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Initial scope check | `.agents/skills/build-product-container/SKILL.md` | Requested skill file was not present in this checkout. | Continued with the repository container spec and available AGENTS instructions. |
| Browser shell test | `pnpm -F @paideia/a-level-shell test` | Playwright could not launch because the Chromium executable was not installed. | Attempted browser install; rerun shell tests in CI or an environment with Playwright browser access. |
| Browser install | `pnpm -F @paideia/a-level-shell exec playwright install chromium` | Playwright CDN returned HTTP 403 for Chromium v1223. | Documented as environment-limited; non-browser gates and jsdom prediction-gate tests pass locally. |
| Full workspace test | `pnpm test` | Unit/jsdom suites passed until Playwright shell and sim-harness tests failed on the missing Chromium executable. | Rerun after browser installation succeeds; no schema or validator weakening was made. |

## Deferred fixes

- Add advisor sign-off in `container.yaml` after human review.
- Consider a reusable dimensional-analysis kernel if equation checking expands
  beyond fixed cards and two displayed examples.
