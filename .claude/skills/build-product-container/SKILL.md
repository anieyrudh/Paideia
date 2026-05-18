---
name: build-product-container
description: Upgrade or create a Paideia container into a product-quality vertical slice. Use when the user says "build the next container", "product slice", "make this container real", or asks to turn a concept into a learner-facing sim.
disable-model-invocation: false
---

# build-product-container

Builds one real learner-facing container at a time, using
`a-level/content/physics/containers/scalars-and-vectors` as the current
reference slice.

## Read First

- `AGENTS.md`
- `docs/container-spec.md`
- `docs/product/container-roadmap.md`
- `core/content-schema/src/index.ts`
- `core/prediction-gate/README.md`
- `core/sim-runtime/README.md`
- `core/ui-sim/README.md`
- Target container `container.yaml`, `concept-card.md`, `simulation/`, `embed/`,
  `problem-solving/`, `sources.md`, and `TECHNICAL.md`

## Procedure

1. Start from a clean branch off `main`.
2. Verify whether the target concept already exists. Upgrade the existing
   container instead of creating a duplicate.
3. Preserve the v2 container shape exactly:

   ```text
   container.yaml
   concept-card.md
   concept-map/
   simulation/
   problem-solving/
   media/
   embed/
   sources.md
   README.md
   TECHNICAL.md
   ```

4. Read the relevant core kernel `AGENTS.md` files before writing sim code.
5. Keep reusable math, physics, rendering, state, and learning logic in `core/`.
   The container composes kernels; it does not invent reusable algorithms.
6. If prediction metadata exists, wrap the revealed observation in
   `PredictionGate` and add tests that prove reveal is blocked before commit.
7. Make every calculation student-facing: show the formula, substituted values,
   units, and a short reason the formula applies.
8. Keep the UI learner-facing. Do not show file paths, package names, kernel
   names, YAML tokens, or implementation details to students.
9. Update `simulation.yaml`, `controls.yaml`, `presets.yaml`, `state-labels.yaml`,
   `embed/api.ts`, `README.md`, and `TECHNICAL.md` to match the executable sim.
10. Regenerate graph data:

    ```bash
    pnpm graph:generate
    ```

11. Run the checks that match the blast radius:

    ```bash
    pnpm -F @paideia/a-level-physics-sims test
    pnpm -F @paideia/a-level-shell test
    pnpm typecheck
    pnpm lint
    pnpm boundary
    pnpm license:check
    pnpm container:validate
    ```

12. Record non-empty Anieyrudh Filter output in `TECHNICAL.md`, including P0
    and P1 findings plus resolutions or explicit deferred follow-up.

## Quality Bar

- The shell route works from generated catalogue data.
- The sim is useful after reveal, not just structurally present.
- Formula and units are visible for all numerical readouts.
- The first interaction is prediction, not explanation.
- Tests cover pure calculations, prediction-gate behavior, shell navigation, and
  revealed-state accessibility where possible.
- Container status becomes `reviewed` only after P0/P1 issues are closed or
  explicitly deferred with a reason.

## Copy-Paste Prompt

```text
You are building Paideia's next product-quality ConceptPackage vertical slice.

Repo: Paideia/paideia
Base branch: main
Create branch: codex/<concept-id>-product-slice

Read first:
- AGENTS.md
- docs/container-spec.md
- docs/product/container-roadmap.md
- core/content-schema/src/index.ts
- core/prediction-gate/README.md
- core/sim-runtime/README.md
- core/ui-sim/README.md
- a-level/content/physics/containers/scalars-and-vectors/
- target container path: <container-path>

Upgrade the existing container if it exists. Preserve the v2 container shape.
Use core kernels for reusable logic. Gate revealed observations with
PredictionGate. Show every calculation with formula, substituted values, units,
and conceptual reason. Keep UI copy student-facing and hide implementation
details.

Deliver:
- product-quality simulation and matching metadata
- updated generated knowledge graph
- non-empty TECHNICAL.md Filter pass
- tests for pure calculations, prediction-gate blocking, shell navigation, and
  revealed-state accessibility where possible

Run:
pnpm graph:generate
pnpm -F @paideia/a-level-physics-sims test
pnpm -F @paideia/a-level-shell test
pnpm typecheck
pnpm lint
pnpm boundary
pnpm license:check
pnpm container:validate
```

## Refuse To Do

- Do not create duplicate containers for the same concept.
- Do not weaken the validator or schema to make a container pass.
- Do not add GPL/AGPL/LGPL runtime dependencies.
- Do not inline reusable kernels inside content packages.
- Do not mark a container reviewed with an empty Filter pass.
