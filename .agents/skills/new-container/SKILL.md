---
name: new-container
description: Scaffold a new Paideia ConceptPackage container with the full canonical layout. Use when the user says "new container", "scaffold a concept package", "/new-container", or asks to start a new concept under a-level/ or sutd/.
disable-model-invocation: false
---

# new-container

Scaffolds a fresh ConceptPackage container matching `docs/container-spec.md §1` exactly.

## When to invoke

- User: "create a new container for <concept>"
- User: "scaffold a concept-package for SHM"
- User: "/new-container"
- Any agent that needs to create a fresh container directory.

## Inputs

Either accept arguments inline or prompt the user for:

| Field | Example | Required |
|---|---|---|
| branch | `a-level` or `sutd` | yes |
| subject | `physics`, `general-paper`, `calculus`, `programming` | yes |
| package_id | kebab-case, e.g. `simple-harmonic-motion` | yes |
| title | `Simple Harmonic Motion` | yes |
| primary_interaction_type | one of the enum in `SimulationSpec.interaction_type` | yes |
| author | name string | yes |
| syllabus_ref | `9749 / 17` or SUTD course code | optional |
| level | `H2`, `H1`, `Freshmore` | optional |

If arguments are passed inline (e.g. `/new-container a-level physics simple-harmonic-motion ...`), run **non-interactively**. Otherwise invoke the interactive scaffolder.

## Procedure

1. Validate `package_id` is kebab-case, ≤ 80 chars, doesn't already exist at `<branch>/content/<subject>/concept-packages/<package_id>/`. Abort with a clear error if it does.

2. Run the scaffolder. Prefer the project script:
   ```bash
   pnpm container:new
   ```
   when interactive. For non-interactive:
   ```bash
   node scripts/new-container.mjs \
     --branch <branch> \
     --subject <subject> \
     --id <package_id> \
     --title "<title>" \
     --interaction <interaction_type> \
     --author "<author>" \
     [--syllabus-ref "<ref>"] [--level <level>]
   ```

3. The scaffolder produces the exact §1 tree by delegating to the `sim-scaffold` skill for the initial sim and to template substitution for the container files. Verify after it runs:
   - `concept-package.yaml`, `concept-card.md`, `sources.md`, `README.md`, `TECHNICAL.md` exist at the container root.
   - `sims/<package_id>/` is created with `SimulationSpec.yaml`, `index.tsx`, `<package_id>.test.ts`.
   - Optional `decision-matrix.md` and `misconceptions.md` stubs created (recommended default).

4. Run `pnpm container:validate <path>` against the new container. It MUST pass on a fresh scaffold. If it fails, the scaffolder is broken — report it; do not hand-patch.

5. Open `concept-package.yaml` in the user's editor (if a `$EDITOR` is set) or print its path.

6. Print next steps:
   ```
   Next:
     1. Fill concept-card.md (or run /gen-concept-card <id> <syllabus_ref>).
     2. Add citations to sources.md.
     3. Implement sims/<package_id>/index.tsx.
     4. Run /review-container before opening a PR.
   ```

## Refuse to do

- Do not invent new top-level files outside the canonical list. The container shape is locked.
- Do not skip `pnpm container:validate` after scaffolding.
- Do not overwrite an existing container; abort instead.
