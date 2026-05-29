# A-Level Shell

First learner-facing Paideia app for A-Level content.

## What it does

- Lists available A-Level containers from generated knowledge graph data.
- Shows the current container's syllabus anchor, misconception targets,
  concept links, and transfer target.
- Launches the registered `resultant-magnitude` sim for
  `scalars-and-vectors`.
- Keeps the prediction checkpoint as the first interactive step before observation.

## Local commands

```bash
pnpm -F @paideia/a-level-shell dev
pnpm -F @paideia/a-level-shell build
pnpm -F @paideia/a-level-shell test
pnpm -F @paideia/a-level-shell test:a11y
```

## Current scope

This app consumes `src/generated/knowledge-graph.tsx`, generated from
`container.yaml`, `concept-map/concept-map.yaml`, and `simulation/simulation.yaml`.

```bash
pnpm graph:generate
```
