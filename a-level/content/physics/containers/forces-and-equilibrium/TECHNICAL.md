# Forces and Equilibrium · Technical Record

## Architecture

- Container path: `a-level/content/physics/containers/forces-and-equilibrium`
- Status: `reviewed`
- Simulation package: `@paideia/a-level-physics-sims/forces-and-equilibrium`
- Content simulation entry: `simulation/index.tsx` re-exports the package sim.

## Imports

| Sim | Module | Symbols / role |
|---|---|---|
| force-balance | `core/mechanics` | `netForce` for resultant force |
| force-balance | `core/prediction-gate` | Reveal boundary |
| force-balance | `core/ui-sim` | Sliders and control grouping |

## SimulationSpec

```yaml
id: force-balance
title: "Force Balance Explorer"
interaction_type: diagram-builder
kernel_deps:
  - core/mechanics
  - core/prediction-gate
  - core/shared
  - core/ui-sim
```

## Accessibility

- Prediction gate blocks the force diagram and formula until a prediction is committed.
- Playwright includes a revealed-state axe scan with zero critical violations.
- Fallback media exists in `media/fallback.svg`.

## Tests

- `pnpm -F @paideia/a-level-physics-sims test`
- `pnpm -F @paideia/sim-harness test`
- `pnpm container:validate`
- `pnpm graph:check`
- `pnpm typecheck`
- `pnpm lint`

## Anieyrudh Filter pass

Date: 2026-05-19
Filter version: aniegpt v1.0

### P0 issues

- Package-boundary violation: draft renderer pointed at `core/plotting`. Resolved by adding `@paideia/a-level-physics-sims/forces-and-equilibrium` and making the container re-export it.
- Placeholder sim-runtime code bypassed the established A-Level package pattern. Resolved by implementing a real package sim with `PredictionGate`, `core/mechanics`, and UI controls.

### P1 issues

- Scaffold content and docs were placeholders. Resolved with reviewed concept text, sources, tests, and technical record.

### High-bandwidth questions surfaced

- A later container should extend this to angled tensions after the learner has mastered vector resolution.

## Iteration log

- Rejected the generic plotting scaffold because equilibrium is a vector-balance concept.
- Kept the first slice intentionally perpendicular: horizontal balance and vertical balance are visible separately.
