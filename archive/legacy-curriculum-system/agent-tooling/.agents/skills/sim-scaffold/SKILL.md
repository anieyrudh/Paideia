---
name: sim-scaffold
description: Low-level primitive that renders simulation templates from core/docs-templates/ into a v2 container's simulation/ directory. Consumed by higher-level container skills.
disable-model-invocation: false
---

# sim-scaffold

Internal primitive. It writes the canonical simulation surface for one v2
container. Prefer `/new-container` or `/new-sim-in-container` unless you are
maintaining scaffolding itself.

## Contract

### Inputs

| Key | Type | Example |
|---|---|---|
| `target_dir` | absolute path | `.../containers/oscillations/simulation/` |
| `placeholders` | map of placeholder to string | see below |

Required placeholders:

| Placeholder | Meaning |
|---|---|
| `<SIM_ID>` | simulation id |
| `<TITLE>` | parent container title |
| `<PACKAGE_ID>` | parent container id |
| `<BRANCH>` | `a-level` or `sutd` |
| `<SUBJECT>` | parent subject |
| `<SimComponent>` | React component name |

## Behaviour

1. Read templates from `core/docs-templates/`:
   - `simulation-spec.template.yaml` -> `simulation.yaml`
   - `sim-index.template.tsx` -> `index.tsx`
   - `sim-test.template.ts` -> `simulation.test.ts`
   - `simulation-controls.template.yaml` -> `controls.yaml`
   - `simulation-presets.template.yaml` -> `presets.yaml`
   - `simulation-runtime.template.yaml` -> `runtime.yaml`
   - `simulation-state-labels.template.yaml` -> `state-labels.yaml`

2. Substitute placeholders literally.

3. Write to the target `simulation/` directory. Fail if a target file already
   exists unless the caller explicitly requested replacement.

4. Check `simulation.test.ts` contains the token `prediction-gate`. If absent,
   the template is broken and the scaffold must fail.

## What This Skill Does Not Do

- Does not modify `container.yaml`.
- Does not create container-level files.
- Does not run validators.
- Does not add missing kernels.

## Refuse To Do

- Do not overwrite files silently.
- Do not edit templates in-place.
- Do not drop missing placeholders.
