---
name: new-container
description: Scaffold a new Paideia v2 container with the canonical layout. Use when the user says "new container", "scaffold a container", "/new-container", or asks to start a new concept under a-level/ or sutd/.
disable-model-invocation: false
---

# new-container

Scaffolds a fresh container matching `docs/container-spec.md §1`.

## When to invoke

- "create a new container for <concept>"
- "scaffold a container for SHM"
- "/new-container"
- any agent that needs a fresh concept directory

## Inputs

Either accept arguments inline or prompt the user for:

| Field | Example | Required |
|---|---|---|
| branch | `a-level` or `sutd` | yes |
| subject | `physics`, `general-paper`, `calculus`, `programming` | yes |
| concept_id | `simple-harmonic-motion` | yes |
| title | `Simple Harmonic Motion` | yes |
| author | `Anieyrudh R` | optional via `PAIDEIA_AUTHOR` |
| syllabus_ref | `9478 / Section II / 10` | optional, fill in `container.yaml` after scaffold |
| level | `H2`, `H1`, `Freshmore` | optional, fill in `container.yaml` after scaffold |

## Procedure

1. Validate `concept_id` is kebab-case and does not already exist at:

   ```text
   <branch>/content/<subject>/containers/<concept_id>/
   ```

2. Run the scaffolder:

   ```bash
   pnpm container:new
   ```

   The current scaffolder is interactive. If non-interactive flags are needed,
   add them to `scripts/new-container.mjs` in a separate scaffolder PR rather
   than pretending they already exist.

3. Verify the scaffolded v2 layout:

   ```text
   container.yaml
   concept-card.md
   concept-map/concept-map.yaml
   concept-map/mindmap.md
   concept-map/graph.mmd
   simulation/simulation.yaml
   simulation/index.tsx
   simulation/simulation.test.ts
   embed/api.ts
   embed/index.ts
   embed/embed.test.ts
   media/thumbnail.svg
   media/fallback.svg
   problem-solving/algorithm.md
   problem-solving/steps.yaml
   sources.md
   README.md
   TECHNICAL.md
   ```

4. Run:

   ```bash
   pnpm container:validate
   ```

   The fresh scaffold must pass before content work begins.

5. Print next steps:

   ```text
   Next:
     1. Fill container.yaml metadata, syllabus reference, dependencies, and capabilities.
     2. Fill concept-card.md or run /gen-concept-card.
     3. Add citations to sources.md.
     4. Implement simulation/index.tsx only if the concept is sim-worthy.
     5. Run /review-container before opening a PR.
   ```

## Refuse to do

- Do not invent files outside `docs/container-spec.md`.
- Do not skip `pnpm container:validate`.
- Do not overwrite an existing container.
- Do not add reusable math or rendering logic inside the container; use `core/`.
