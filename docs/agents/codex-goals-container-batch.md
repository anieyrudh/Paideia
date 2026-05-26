# Codex Goals Container Batch Runbook

Use this document from Codex Cloud Goals when a single instance is assigned a
batch of container queue IDs. The Goal prompt should stay short and list only
the queue IDs; this file carries the full operating rules.

## Operating Principle

One queue ID becomes one branch and one pull request.

A batch is a sequence, not one large diff. Work through the assigned queue IDs
one at a time. Never combine multiple containers in a single PR.

## Recommended Starter Batches

These non-overlapping batches are safe starting points for parallel Goal runs.
Assign one batch per instance. If a queue ID is already built or already has an
open PR, skip it and report the skip in the completion report.

### Batch A

```text
sutd.10-016-science-for-a-sustainable-world.atomic-structure-and-electron-configuration
sutd.10-016-science-for-a-sustainable-world.chemical-bonding-and-intermolecular-forces
sutd.10-016-science-for-a-sustainable-world.thermochemistry-and-equilibrium
sutd.10-016-science-for-a-sustainable-world.polymers-and-plastic-waste-management
sutd.10-016-science-for-a-sustainable-world.electrochemistry-and-batteries
sutd.10-016-science-for-a-sustainable-world.solar-energy-and-band-theory
sutd.10-016-science-for-a-sustainable-world.water-quality-and-treatment
sutd.10-016-science-for-a-sustainable-world.biodiversity-loss-and-land-use
sutd.10-017-technological-world-e-and-m.coulomb-s-law-and-discrete-charge-fields
sutd.10-017-technological-world-e-and-m.gauss-law-for-symmetric-distributions
```

### Batch B

```text
sutd.10-017-technological-world-e-and-m.capacitor-with-dielectric
sutd.10-017-technological-world-e-and-m.magnetic-induction-faraday-lenz
sutd.10-017-technological-world-e-and-m.rlc-circuit-and-resonance
sutd.10-017-technological-world-e-and-m.maxwell-equations-and-em-waves
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.partial-derivatives-and-gradient
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.optimisation-with-lagrange-multipliers
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.double-and-triple-integrals
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.line-integrals-and-conservative-vector-fields
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.divergence-and-curl
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.gaussian-elimination-and-linear-systems
```

### Batch C

```text
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.determinant-and-trace
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.eigenvalues-and-eigenvectors
sutd.10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra.linear-transformations
sutd.10-019-science-and-technology-for-healthcare.cell-structure-and-the-membrane
sutd.10-019-science-and-technology-for-healthcare.protein-folding-and-function
sutd.10-019-science-and-technology-for-healthcare.gene-expression-dna-to-rna-to-protein
sutd.10-019-science-and-technology-for-healthcare.cell-signalling-pathways
sutd.10-019-science-and-technology-for-healthcare.cell-cycle-and-mitosis-meiosis
sutd.10-019-science-and-technology-for-healthcare.immune-system-and-vaccines
sutd.10-019-science-and-technology-for-healthcare.cancer-genetics-and-therapy
```

## Required Loop

For each assigned queue ID:

1. Sync `main`.
2. Check whether the queue ID is already built or already has an open PR.
3. If it is already covered, record that and move to the next queue ID.
4. Create a branch:

   ```text
   codex/container/<queue-id>
   ```

5. Build exactly that container.
6. Run the required checks.
7. Fix all P0 and P1 findings.
8. Record P2 findings in `TECHNICAL.md`.
9. Open one PR.
10. Stop if conflicts, missing kernels, missing source decisions, or environment
    failures make the next item unsafe to start.
11. If continuing is safe, return to `main`, sync/rebase, and repeat.

## Files To Read First

Read these before writing code:

- `AGENTS.md`
- `docs/container-spec.md`
- `docs/product/container-wave-runbook.md`
- `docs/product/container-build-queue.yaml`
- `docs/product/simulation-presentation-standard.md`
- `docs/product/container-roadmap.md`
- `core/content-schema/src/index.ts`
- `core/shared/src/index.ts`
- `core/prediction-gate/README.md`
- the relevant `core/<kernel>/AGENTS.md` files
- nearby reviewed containers in the same curriculum or subject

If `PAIDEIA_CONTAINER_TABLES_V2.md` or
`docs/product/container-table-queue.yaml` exists in the branch, use it as extra
source context. If it does not exist, use the assigned queue IDs and the tracked
build queue/roadmap as the source of truth.

## Target Path Rule

Use the target path declared in the queue when present.

If no target path is declared, derive it from the queue ID:

- `sutd.<module-slug>.<concept-slug>` becomes
  `sutd/content/<module-slug>/containers/<concept-slug>/`
- `alevel.<subject>.<concept-slug>` becomes
  `a-level/content/<subject>/containers/<concept-slug>/`
- `shared.<discipline>.<concept-slug>` becomes
  `shared/content/<discipline>/containers/<concept-slug>/`

If the derived path looks wrong, stop and report the blocker instead of
inventing a new convention.

## Container Surfaces

Every complete container must include:

- `container.yaml`
- `concept-card.md`
- `concept-map/concept-map.yaml`
- `concept-map/mindmap.md`
- `concept-map/graph.mmd`
- `simulation/simulation.yaml` for sim-worthy concepts
- `simulation/index.tsx` for sim-worthy concepts
- `simulation/controls.yaml` for sim-worthy concepts
- `simulation/presets.yaml` for sim-worthy concepts
- `simulation/runtime.yaml` for sim-worthy concepts
- `simulation/state-labels.yaml` for sim-worthy concepts
- `simulation/simulation.test.ts` for sim-worthy concepts
- `embed/api.ts`
- `embed/index.ts`
- `embed/embed.test.ts`
- `media/thumbnail.svg`
- `media/fallback.svg`
- `problem-solving/algorithm.md`
- `problem-solving/steps.yaml`
- every transfer problem markdown declared by `container.yaml`
- `sources.md`
- `README.md`
- `TECHNICAL.md`

Do not add unrelated file shapes unless the container spec already allows them.

## Simulation Standard

Text-only reveals are not product quality.

For every sim-worthy concept:

- Prediction gate must block reveal before commit.
- Revealed state must include a real visual model: chart, plot, SVG diagram,
  canvas, 2D scene, 3D scene, or equivalent.
- Direct manipulation must visibly change the model.
- Every calculation shown to a learner must show formula, symbol legend,
  substitution with units, result with units, and interpretation.
- Formulas should use LaTeX-compatible notation.
- Formula colours should align with graph traces, controls, vectors, and
  readouts when useful.
- Learner-facing UI must not mention package names, file paths, kernels, or
  implementation details.

Use existing Paideia kernels first. Do not inline reusable domain logic that
belongs in `core/*`.

## Media Standard

Every container needs:

- `media/thumbnail.svg`
- `media/fallback.svg`

Media should teach the concept. It should not be decorative filler.

Generated media is allowed for thumbnails, fallback diagrams, sprites, or
explanatory visuals, but it must not replace the data-driven simulation.

Do not copy textbook diagrams, proprietary assets, GPL simulation code, or
non-compatible media.

## Scope Boundaries

Allowed edits for one container PR:

- target container directory
- relevant simulation package file/export
- tests required for the new simulation route
- generated graph/sim-registry artifacts
- the queue status for the claimed entry
- `README.md` or `TECHNICAL.md` generated for that container

Avoid unrelated cleanup. If a broad fix is required, stop and report it as a
separate blocker.

## Review Severity

P0 blocks merge:

- invalid container shape
- missing prediction gate
- sim-worthy concept reveals only text
- cross-branch imports
- GPL/proprietary runtime code
- copied or uncited source material
- reusable math hidden in the container
- failing required checks caused by the PR

P1 should be fixed before merge:

- weak or misleading formula
- missing formula legend/substitution/units
- inaccessible controls
- shallow tests
- stale graph data
- student UI leaks implementation details

P2 may be recorded for later:

- extra presets
- better thumbnails
- richer transfer examples
- wording polish

## Required Checks

Run these before opening each PR:

```bash
pnpm container:validate <container-path>
pnpm container:docs <container-path>
pnpm graph:generate
pnpm graph:check
pnpm typecheck
pnpm lint
pnpm test
pnpm boundary
pnpm license:check
pnpm roadmap:validate
pnpm agent:validate
```

If a command cannot run because of the environment, record the exact error and
run the closest focused replacement. Do not present environment-blocked checks
as green.

## PR Requirements

PR title:

```text
feat(<curriculum>): <Concept Title> product slice
```

PR body must include:

- queue ID
- target path
- what was built
- visual simulation summary
- media created
- sources and licensing notes
- commands run and exact results
- P0/P1 findings fixed
- P2 findings remaining
- environment blockers, if any

## Batch Completion Report

At the end of the Goal run, report:

- queue IDs completed with PR links
- queue IDs skipped because already covered
- queue IDs blocked and why
- checks that failed due to environment
- one paragraph on where the agent struggled
