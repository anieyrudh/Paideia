---
name: new-sim-in-container
description: Add or replace the declared simulation surface in an existing Paideia v2 container. Use when the user says "add a sim", "new sim in <container>", "/new-sim-in-container", or wants a simulation for an existing container.
disable-model-invocation: false
---

# new-sim-in-container

Adds the canonical `simulation/` surface to an existing v2 container or replaces
placeholder simulation files that were created by `pnpm container:new`.

## When to invoke

- "add a sim to <concept-id>"
- "make the SHM container interactive"
- "/new-sim-in-container <container-path>"

## Inputs

| Field | Example | Required |
|---|---|---|
| container_path | `a-level/content/physics/containers/simple-harmonic-motion` | yes |
| sim_id | `oscillation-explorer` | yes |
| sim_title | `Oscillation Explorer` | yes |
| interaction_type | `diagram-builder` | yes |
| kernel_deps | `core/numerical-math`, `core/plotting`, `core/ui-sim` | yes |

## Procedure

1. Verify `container_path/container.yaml` exists and parses.

2. Read:
   - `docs/container-spec.md`
   - `core/content-schema/src/index.ts`
   - target `container.yaml`
   - `docs/product/simulation-presentation-standard.md`
   - any kernel `AGENTS.md` files listed in `kernel_deps`

3. Verify every `kernel_deps` entry resolves to an existing `core/<module>/`
   directory. If a dependency is missing, stop. Kernels are created through
   `/new-kernel`, not opportunistically inside a container.

4. Update the canonical files:

   ```text
   simulation/simulation.yaml
   simulation/index.tsx
   simulation/controls.yaml
   simulation/presets.yaml
   simulation/runtime.yaml
   simulation/state-labels.yaml
   simulation/simulation.test.ts
   ```

   Preserve existing useful content. Do not create nested sim directories unless
   the container spec is changed by ADR.

5. Update `container.yaml`:
   - `capabilities.sim_worthy: true`
   - `capabilities.interactive_simulation: true`
   - `simulation.spec: simulation/simulation.yaml`
   - `aid_types` includes `simulation`
   - `kernel_deps` in `simulation/simulation.yaml` list the core modules used

6. The simulation test must include a prediction-gate assertion when prediction
   is declared. It should prove observation is blocked before commit.

7. Formula and calculation UI must follow
   `docs/product/simulation-presentation-standard.md`: LaTeX formula block,
   nearby color-coded symbol legend, substituted values, units, final result,
   and conceptual reason.

8. Choose the renderer deliberately:
   - React + core kernels for normal formula, chart, slider, and table labs.
   - Web game foundations first when engine, input, state, asset, save, debug,
     or performance boundaries are unclear.
   - Phaser only for game-like 2D scenes.
   - Sprite pipeline only when shipping 2D sprite animation assets.
   - Game UI frontend for HUD, overlay, menu, and playfield-protection work.
   - React Three Fiber only for genuinely 3D React-hosted scenes.
   - GLB/glTF asset pipeline only for shipping 3D assets.

9. Run:

   ```bash
   pnpm container:validate
   pnpm graph:generate
   pnpm test
   ```

## Refuse to do

- Do not add missing core kernels here.
- Do not bypass `core/prediction-gate`.
- Do not inline reusable physics, maths, plotting, or control logic that belongs
  in `core/`.
- Do not weaken the container validator to make a sim pass.
- Do not expose package names, file paths, YAML keys, or queue IDs in learner UI.
