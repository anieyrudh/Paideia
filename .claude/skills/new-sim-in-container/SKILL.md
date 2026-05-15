---
name: new-sim-in-container
description: Add a new sim to an existing ConceptPackage container. Use when the user says "add a sim", "new sim in <container>", "/new-sim-in-container", or wants a second simulation in an existing concept-package.
disable-model-invocation: false
---

# new-sim-in-container

Adds a sim under `<container>/sims/<sim-id>/` and registers it in the manifest. Use when the container already exists and a new interaction view is needed.

## When to invoke

- "add a sim to <package-id>"
- "I need a second sim for SHM showing the energy view"
- "/new-sim-in-container <package-id>"

## Inputs

Required:

| Field | Example |
|---|---|
| package_path | path to the existing container |
| sim_id | kebab-case, unique within the container |
| sim_title | human title |
| interaction_type | enum from `SimulationSpec.interaction_type` |
| kernel_deps | list of `core/<module>` paths |

If not passed inline, prompt for each. Read `concept-package.yaml` first to show the user existing sims so they don't pick a duplicate id.

## Procedure

1. Verify the container exists and `concept-package.yaml` parses. If not, abort and tell the user to run `/new-container` first or fix the manifest.

2. Verify `sim_id` does NOT already appear in `items.sims[]` and `sims/<sim_id>/` does NOT exist. Abort on conflict.

3. Verify each entry in `kernel_deps` resolves to an existing `core/<module>/` directory. If a dep is missing, list the missing ones and abort — kernels are owned via contracts, not created on the fly here.

4. Invoke the `sim-scaffold` skill with:
   - target directory: `<package_path>/sims/<sim_id>/`
   - placeholders: `<SIM_ID>`, `<SIM_TITLE>`, `<INTERACTION_TYPE>`, `<KERNEL_DEPS>`, `<PACKAGE_ID>` (read from manifest)
   - produces: `SimulationSpec.yaml`, `index.tsx`, `<sim_id>.test.ts` (with the prediction-gate scaffold).

5. Append the sim entry to `concept-package.yaml` under `items.sims`. Preserve formatting; insert a fresh `SimulationSpec` block matching the schema with minimal `manipulate.controls`, `observe.renderers`, `explain.prompt` stubs. Do NOT remove existing sims.

6. Run:
   ```
   pnpm container:validate <package_path>
   pnpm --filter <pkg> typecheck
   ```
   Both must pass on the fresh scaffold.

7. Print next steps:
   ```
   Sim scaffolded: sims/<sim_id>/
   Next:
     1. Flesh out SimulationSpec.yaml (manipulate / observe / explain).
     2. Implement the kernel bindings in index.tsx.
     3. Replace the prediction-gate test scaffold with real selectors (the gate assertion is mandatory).
     4. Run /review-container before opening a PR.
   ```

## Refuse to do

- Do not silently add a missing kernel under `core/`. That requires a separate core-change-proposal.
- Do not remove or overwrite existing sims in the manifest.
- Do not omit the prediction-gate test scaffold. It must ship in `<sim_id>.test.ts` even if the selectors are placeholders.
