# Technical Notes

## Architecture

The container now ships a learner-facing quantity dependency map lab rather than
only static content. The simulation surface re-exports the implementation from
`@paideia/a-level-physics-sims/physical-quantities`, keeping reusable React and
unit-reasoning logic in the shared A-Level physics sims package while the
container owns the YAML contract and pedagogical framing.

The graph uses a fixed, deterministic learner-facing layout for the small SI
quantity network. The student UI only exposes concept language: quantities,
units, dependency trails, scalar or vector status, and base-unit reductions. It
does not expose package names, YAML fields, kernel names, or implementation
details.

## Prediction-gate review

- `PredictionGate` wraps the entire lab, so the map, classification cards, and
  unit-reasoning panel are not mounted until the learner commits a prediction.
- The prompt asks for the dependency chain that should prove the newton's base
  units; it does not mark the correct option before commit.
- The post-gate observation reveals `1 N = 1 kg m s^-2` and lets learners switch
  to acceleration or energy after committing.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` with `predict_at: per-sim`.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares
  `core/prediction-gate`, `core/shared`, and `core/ui-sim`.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- The sim package unit tests assert both the unit reduction and the prediction-gate block.

## Failure log and fixes

- During implementation, the requested `.agents/skills/build-product-container/SKILL.md`
  file was not present in the checkout. I followed the repository container spec
  and the existing product-slice containers instead.
- The graph nodes were initially drafted as SVG-contained HTML buttons. This was
  changed to keyboard-accessible SVG groups so the diagram remains valid SVG.
- A first attempt to use `core/graph-layout` directly from the sim package added
  avoidable workspace-link/typecheck friction. The lab now uses a fixed
  deterministic layout for this small concept graph while preserving the same
  dependency-map learning model.
- Playwright-based shell and sim-harness tests could not launch locally because
  the Chromium binary is absent. Attempting `pnpm --dir a-level/apps/shell exec
  playwright install chromium` also failed with a 403 from the Playwright CDN,
  so the failure is recorded as an environment limitation rather than a product
  assertion failure.

## Anieyrudh Filter pass

Date: 2026-05-17

- P0 issues: 0 open.
- P1 issues: 0 open.
- Answer-leak audit: passed. The base-unit reasoning panel and dependency graph
  do not render before prediction commit.
- Student-facing copy audit: passed. Visible copy uses classroom terms only.
- PMOE-T audit: passed. Predict happens before map manipulation/observation;
  the reasoning panel asks learners to transfer the dimension check to equations.
- Misconception audit: passed. The lab targets unit-as-decoration,
  quantity-equals-number, and derived-quantity-as-base-quantity misconceptions.
