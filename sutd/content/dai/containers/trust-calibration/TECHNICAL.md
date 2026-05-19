# Trust Calibration · Technical Record

## Architecture

- Container path: `sutd/content/dai/containers/trust-calibration`
- Status: `reviewed`
- Simulation package: `@paideia/sutd-sims/trust-calibration`
- Content simulation entry: `simulation/index.tsx` re-exports the package sim.

## Imports

| Sim | Module | Symbols / role |
|---|---|---|
| trust-calibration | `core/sim-runtime` | Stage runtime and local state |
| trust-calibration | `core/prediction-gate` | Reveal boundary |
| trust-calibration | `core/probability-stats` | Expected risk calculation |

## SimulationSpec

```yaml
id: trust-calibration
title: "Trust Calibration Explorer"
interaction_type: decision-matrix
kernel_deps:
  - core/sim-runtime
  - core/prediction-gate
  - core/probability-stats
```

## Accessibility

- Prediction gate blocks reveal until a prediction and rationale are committed.
- Route-level Playwright test includes an axe scan after reveal.
- Fallback media exists in `media/fallback.svg`.

## Tests

- `pnpm container:validate`
- `pnpm graph:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

## Anieyrudh Filter pass

Date: 2026-05-19
Filter version: aniegpt v1.0

### P0 issues

- Package-boundary violation: draft implementation lived inside the content folder and imported a wrong renderer package. Resolved by moving the sim to `@paideia/sutd-sims/trust-calibration` and using `module: local`.
- Prediction-gate test was placeholder-only. Resolved with Playwright assertions for blocked reveal, committed reveal, manipulation, and axe critical violations.

### P1 issues

- Concept card and technical record were scaffold placeholders. Resolved with reviewed concept text and this technical record.

### High-bandwidth questions surfaced

- The next DAI slice should decide whether trust calibration uses real course datasets or small deterministic teaching datasets.

## Iteration log

- Rejected the scaffold `FunctionPlot` path because this concept is a decision-policy surface, not a plotting demo.
- Kept the container focused on threshold, wrong-decision cost, review cost, and the explicit total-cost formula.
