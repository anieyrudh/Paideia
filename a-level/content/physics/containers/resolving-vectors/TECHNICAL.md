# Technical Notes

## Architecture

The simulation renderer is owned by `@paideia/a-level-physics-sims` and imported
through `simulation/simulation.yaml` by the generated shell graph.

## Validation Notes

- `container.yaml` validates against `ContainerSpec`.
- `simulation/simulation.yaml` validates against `SimulationSpec`.
- `simulation/simulation.test.ts` uses the shared prediction-gate harness.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.

## Anieyrudh Filter pass
