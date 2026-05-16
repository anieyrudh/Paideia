# A-Level Shell

First learner-facing Paideia app for A-Level content.

## What it does

- Lists available A-Level ConceptPackages.
- Shows the current container's syllabus anchor, PMOE-T stages, misconception
  targets, and transfer target.
- Launches the registered `resultant-magnitude` sim for
  `scalars-and-vectors`.
- Keeps the prediction gate as the first interactive step before observation.

## Local commands

```bash
pnpm -F @paideia/a-level-shell dev
pnpm -F @paideia/a-level-shell build
pnpm -F @paideia/a-level-shell test
pnpm -F @paideia/a-level-shell test:a11y
```

## Current scope

This app is intentionally registry-backed and small. It proves the product path
from container metadata to a runnable sim. The next product layer should replace
the hard-coded registry with generated catalogue data from validated containers.
