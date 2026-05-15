---
name: sim-scaffold
description: Low-level primitive — read templates from core/docs-templates/, perform <PLACEHOLDER> substitution, write files into a target sim directory. Consumed by /new-container and /new-sim-in-container. Do not invoke directly unless you know the placeholder contract.
disable-model-invocation: false
---

# sim-scaffold

Internal primitive. Does NOT prompt. Does NOT validate against the schema. Does NOT register the sim in `concept-package.yaml`. Higher-level skills (`/new-container`, `/new-sim-in-container`) wrap this.

## Contract

### Inputs (caller MUST provide all)

| Key | Type | Example |
|---|---|---|
| `target_dir` | absolute path | `.../sims/oscillator/` |
| `placeholders` | map of `<KEY>` → string | see below |

Required placeholders:

| Placeholder | Meaning |
|---|---|
| `<SIM_ID>` | kebab-case sim id; matches the leaf directory name |
| `<SIM_TITLE>` | human-readable title |
| `<INTERACTION_TYPE>` | one of the `SimulationSpec.interaction_type` enum |
| `<KERNEL_DEPS>` | YAML array literal, e.g. `["core/numerical-math", "core/plotting"]` |
| `<PACKAGE_ID>` | parent container id |
| `<BRANCH>` | `a-level` or `sutd` |
| `<SUBJECT>` | parent subject |

Caller is responsible for ensuring these are well-formed. This skill does NO validation.

### Behaviour

1. Read templates from `core/docs-templates/`:
   - `simulation-spec.template.yaml` → `<target_dir>/SimulationSpec.yaml`
   - `sim-index.template.tsx` → `<target_dir>/index.tsx`
   - `sim-test.template.ts` → `<target_dir>/<SIM_ID>.test.ts`

2. For each template, substitute every `<PLACEHOLDER>` occurrence with the matching value from `placeholders`. Substitution is literal string replace; placeholders are case-sensitive.

3. Write the three files to `target_dir`. Create the directory if missing. **Fail-fast** if any target file already exists — do not overwrite. The caller is responsible for conflict checks.

4. Return:
   ```
   sim-scaffold · <SIM_ID>
   - SimulationSpec.yaml: written
   - index.tsx: written
   - <SIM_ID>.test.ts: written (contains prediction-gate token)
   ```

5. After writing the test file, `Grep` it for the literal token `prediction-gate`. If absent, the template is broken — emit a P0 error and abort. (This is a self-test of the templates themselves, not of the caller's input.)

## What this skill does NOT do

- Does not prompt the user.
- Does not modify `concept-package.yaml`.
- Does not run validators or typecheck.
- Does not check that `<KERNEL_DEPS>` resolve to real `core/` modules.
- Does not create container-level files (`concept-card.md`, `sources.md`, etc.) — those are produced by `/new-container` directly from the container templates.

All of that is the caller's job. Keep this primitive small and predictable.

## Refuse to do

- Do not overwrite existing files. Abort with a clear error and let the caller resolve.
- Do not edit templates in-place; only substitute and write copies.
- Do not silently drop a missing placeholder. If the template contains a `<KEY>` that the caller did not supply, fail with: `missing placeholder: <KEY>`.
