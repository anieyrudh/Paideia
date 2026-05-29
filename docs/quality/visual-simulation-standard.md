# Visual Simulation Standard

This is the merge bar for sim-worthy Paideia containers.

## Reveal Contract

Prediction comes first. A learner must commit a prediction before the route shows
the model output.

After the prediction is committed, the `Observation unlocked` region must contain
all evidence needed to understand the result:

| Required item | Acceptance bar |
| --- | --- |
| Visual model | A visible `svg`, `canvas`, `[role="img"]`, chart, plot, diagram, 2D scene, 3D scene, or equivalent data-driven artifact |
| Readout | Key values update when controls change |
| Formula | Formula used, substitution, units, result, and interpretation |
| Legend | Symbol and colour mapping sits near the formula or visual |
| Accessibility | Keyboard path works and axe has no serious or critical violations |

Text-only reveal states are P0 for sim-worthy containers.

## Runtime Metadata

Every route that has been backfilled to the product reveal standard declares its
browser path in `simulation/runtime.yaml`:

```yaml
visual_quality:
  setup:
    - role: button
      name: "Set up ..."
  prediction:
    option_label: "Learner-facing answer"
    rationale: "Short prediction rationale."
  reveal:
    observation_label: "Observation unlocked"
    visual: required
    formula: required
```

Use `formula: not-applicable` only when there is genuinely no calculation. Add
`formula_not_applicable_reason` so the exemption is reviewable.

## Test Gate

Route-specific Playwright tests should call
`expectProductSimulationReveal(page, contract)` from
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
commits the prediction, and fails if the revealed observation lacks a visible
visual artifact or required formula language.
