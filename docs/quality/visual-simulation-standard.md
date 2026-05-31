# Visual Simulation Standard

This is the merge bar for sim-worthy Paideia containers.

## Live Simulation Contract

The simulation comes first. A sim-worthy route must show the model output,
visuals, formulas, controls, and readouts on first load. Prediction remains
mandatory as a compact reflection checkpoint, but it must not block the
simulation.

The observation region must contain all evidence needed to understand the
result:

| Required item | Acceptance bar |
| --- | --- |
| Visual model | A visible `svg`, `canvas`, `[role="img"]`, chart, plot, diagram, 2D scene, 3D scene, or equivalent data-driven artifact |
| Readout | Key values update when controls change |
| Formula | Formula used, substitution, units, result, and interpretation |
| Legend | Symbol and colour mapping sits near the formula or visual |
| Accessibility | Keyboard path works and axe has no serious or critical violations |

Text-only observation states are P0 for sim-worthy containers.

## Runtime Metadata

Every route that has been backfilled to the product simulation standard declares
its browser path in `simulation/runtime.yaml`:

```yaml
visual_quality:
  setup:
    - role: button
      name: "Set up ..."
  prediction:
    option_label: "Learner-facing answer"
    rationale: "Short prediction rationale."
  observation:
    observation_label: "Observation"
    visual: required
    formula: required
```

Existing `visual_quality.reveal` metadata is accepted as a deprecated alias
during migration, but new routes should use `visual_quality.observation`.

Use `formula: not-applicable` only when there is genuinely no calculation. Add
`formula_not_applicable_reason` so the exemption is reviewable.

## Test Gate

Route-specific Playwright tests should call
`expectProductSimulationExperience(page, contract)` from
`testing/sim-harness/src/playwright-contract.ts`.

The repo-wide gate is:

```bash
pnpm container:visual-quality
```

To focus one route:

```bash
pnpm container:visual-quality -- sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths
```

The command reads `visual_quality` metadata, opens the route in the sim harness,
asserts that the visual model and formula evidence are visible before commit,
commits the prediction checkpoint, and fails if the observation lacks a visible
visual artifact or required formula language.
