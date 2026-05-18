# Technical Notes

## Architecture

The container is now a product-quality interactive slice. The learner-facing
simulation is rendered by `@paideia/a-level-physics-sims/quantity-map` and is
referenced through `simulation/simulation.yaml`. Reusable graph ordering is
provided by `core/graph-algorithms`; prediction enforcement is provided by
`core/prediction-gate`; controlled selectors are provided by `core/ui-sim`.

The interaction model is a quantity map / dependency graph lab. The sim keeps the
answer-bearing graph, dimensional verdict, formula reasoning, and unit reductions
inside `PredictionGate`, so the initial screen asks for a committed prediction
before any observation is mounted.

## Validation Notes

- `container.yaml` validates against `ContainerSpec`.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec`.
- `simulation/simulation.yaml` validates against `SimulationSpec`.
- `simulation/simulation.test.ts` uses the shared prediction-gate harness.
- `@paideia/a-level-physics-sims` includes jsdom tests for the quantity-map model and prediction-gate contract.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.

## Self-review for answer leaks and UI copy

- The pre-commit screen contains the predict prompt, multiple-choice options, and rationale field only.
- The dependency graph, target equation controls, dimensional verdict, and formula reasoning are children of `PredictionGate` and are not mounted before commit.
- UI copy uses learner-facing language such as "Quantity map lab", "Target quantity", and "Formula reasoning"; it does not mention package names, YAML, kernels, or attached files.

## Failures and fixes during implementation

- Added the new `@paideia/graph-algorithms` workspace dependency after the lab model started using topological ordering.
- Added a dedicated quantity-map prediction-gate contract so observation text is asserted to be absent before commit and present after commit.
- Moved all equation controls and dimensional verdicts behind the prediction gate to avoid revealing the force-dimension answer before prediction.
- `pnpm -F @paideia/a-level-shell test` and the Playwright portion of `pnpm test` could not launch Chromium because the browser binary is absent in the environment; `pnpm -F @paideia/a-level-shell exec playwright install chromium` attempted to download it but the CDN returned 403 Forbidden.
- `pnpm install --lockfile-only` also hit a registry 403 for `dependency-cruiser`; the workspace lockfile entry for the new workspace dependency was updated directly to match existing lockfile structure.

## Anieyrudh Filter pass

Date: 2026-05-17
Reviewers: self-review by Codex following container-auditor, sim-architect, and pedagogy-reviewer checklists. Subagents were not spawned because this environment only permits delegation when the user explicitly requests parallel agent work.

### P0 resolved
- Prediction leak risk — resolution: graph, equation controls, formula reasoning, and dimensional verdict are mounted only as `PredictionGate` children.
- Container shape risk — resolution: added the canonical simulation files and updated `container.yaml` simulation/component paths.

### P1 addressed or deferred
- Product-slice engagement — addressed with a coherent quantity map / dependency graph lab, highlighted dependency path, scalar/vector badges, and live dimensional verdicts.
- Kernel boundaries — addressed by using `core/graph-algorithms` for topological dependency ordering and keeping rendering in the A-Level physics sim package.

### P2 noted
- The first version covers common foundation quantities rather than every SI base quantity; electric current, temperature, amount of substance, and luminous intensity can be added when downstream containers need them.
