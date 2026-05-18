# Technical Notes

## Architecture

This container now ships as a learner-facing quantity map / dependency graph
lab. The content-level simulation entry is a thin re-export of the executable
React surface in `@paideia/a-level-physics-sims/quantity-map`, matching the
pattern used by neighbouring A-Level Physics simulation containers.

The simulation uses `PredictionGate` so the dependency graph, dimensional
verdict, and formula reasoning are not mounted until the learner commits a
prediction. The graph ordering uses the shared graph-algorithms kernel for a
stable dependency order; rendering and classroom copy stay inside the A-Level
physics sim package.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` and declares `predict_at: both`.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares a sim-level prediction.
- `simulation/simulation.test.ts` records the browser prediction-gate contract.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec`.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.

## Answer-leak self-review

- The only pre-gate UI is the `PredictionGate` prompt, answer options, rationale field, and commit button.
- The dependency graph cards, formula verdict, dimension reductions, and explanation prompt are children of `PredictionGate` and therefore are not rendered before commit.
- Student-facing UI copy avoids package names, file names, schema tokens, and kernel implementation details.

## Anieyrudh Filter pass

Date: 2026-05-17

- P0: Prediction answer leak before commit. Result: pass. The dimensional verdict and dependency graph are gated; the prediction options ask for a commitment but do not reveal the post-commit reasoning.
- P0: Product slice too scaffold-like. Result: pass. The lab has a coherent quantity-map interaction with controls, graph cards, scalar/vector badges, unit readouts, and formula verdicts.
- P0: Implementation details in learner UI. Result: pass. Learner copy uses physics language only; package and kernel names remain in technical metadata.
- P1: Base/derived and scalar/vector coverage. Result: pass. The map includes length, time, mass, area, speed, velocity, acceleration, force, and pressure, with base/derived and scalar/vector labels.
- P1: Dimensional consistency reasoning. Result: pass. The formula panel compares left-hand and right-hand dimensions and explains mismatches.
- P1: Transfer coverage. Result: pass. The acceleration transfer problem now asks learners to classify acceleration as a derived vector quantity and reduce it to base SI dimensions.

## Failure log

Date: 2026-05-17

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Initial selector test | `pnpm -F @paideia/a-level-physics-sims test` planning | Shared `Selector` emits option indices rather than raw option ids in DOM events. | The regression test selects the displayed option index while the component API remains typed with quantity/equation ids. |
| Dependency refresh | `pnpm install` | Registry returned HTTP 403 for `@testing-library/dom` metadata in this environment while refreshing workspace links. | Added the workspace dependency declaration and lockfile entry; local validation used the existing workspace install plus a local graph-algorithms link. |
| Browser installation | `pnpm -F @paideia/a-level-shell exec playwright install chromium` | Playwright CDN returned HTTP 403 for Chromium v1223. | Unit, type, lint, boundary, license, graph, and container checks were run; Playwright browser checks remain an environment follow-up. |
| Full workspace tests | `pnpm test` | Unit suites passed through the physics sim package, then Playwright shell/sim-harness tests failed because Chromium was unavailable. | Treat as an environment limitation; rerun after browsers are installed. |

## Known tradeoffs

- The dependency graph is a curated map for core introductory quantities, not an exhaustive SI catalogue.
- The layout is currently SVG-free card graph rendering so it remains robust in the existing jsdom and shell harnesses; a future visual polish pass could add draggable nodes if the shell route needs richer spatial interaction.
