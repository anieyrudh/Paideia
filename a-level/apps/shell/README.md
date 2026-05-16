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

This app consumes generated catalogue data from
`src/generated/catalogue.tsx`. Regenerate it after changing container manifests:

```bash
pnpm catalogue:generate
```

The generator is branch-aware: A-Level app data comes from `a-level/content/**`;
future SUTD app data should be emitted from `sutd/content/**` into the SUTD
shell when that app exists.

For v0, each app-launchable sim manifest uses the first
`items.sims[].observe.renderers[].module` entry as the default-exporting React
component consumed by the shell.
