# Build One Container

Copy this prompt into Codex, Claude Code, or another coding agent when assigning
one Paideia container. Replace the placeholders before sending it.

~~~text
You are building exactly one Paideia product-quality container.

Repository: <GITHUB_REPO_URL>
Base branch: main
Create branch: codex/container/<QUEUE_ID>

Queue item:
- queue_id: <QUEUE_ID>
- source_table: <TABLE_NUMBER_AND_TITLE>
- concept: <CONCEPT_TITLE>
- target_path: <TARGET_CONTAINER_PATH>
- status: ready-for-build

Read first:
- AGENTS.md
- docs/container-spec.md
- docs/product/container-quality-rubric.md
- docs/quality/visual-simulation-standard.md
- docs/quality/visual-exemplar-gallery.md
- docs/product/core-foundation-gap-matrix.md
- docs/product/container-roadmap.md
- docs/product/container-table-queue.yaml
- core/content-schema/src/index.ts
- core/shared/src/index.ts
- core/prediction-gate/README.md
- the AGENTS.md file for every core kernel you use
- nearby reviewed containers in the same curriculum or subject, if present

Scope rules:
- Build exactly this queue item.
- Do not build adjacent concepts.
- Do not edit unrelated queue rows.
- Do not modify unrelated containers.
- Change the queue row from ready-for-build to in-build in this branch.
- Keep the queue row in-build until the PR lands.
- If the concept should be shared across curricula, stop and ask whether it
  belongs in shared/content/... before building a curriculum-specific copy.

Required container shape:
- container.yaml
- concept-card.md
- concept-map/concept-map.yaml
- concept-map/mindmap.md
- concept-map/graph.mmd
- simulation/simulation.yaml when sim-worthy
- simulation/index.tsx when sim-worthy
- simulation/controls.yaml when sim-worthy
- simulation/presets.yaml when sim-worthy
- simulation/runtime.yaml when sim-worthy
- simulation/state-labels.yaml when sim-worthy
- simulation/simulation.test.ts when sim-worthy
- embed/api.ts
- embed/index.ts
- embed/embed.test.ts
- media/thumbnail.svg
- media/fallback.svg
- problem-solving/algorithm.md
- problem-solving/steps.yaml
- transfer problem markdown declared by container.yaml
- sources.md
- README.md
- TECHNICAL.md

Simulation quality:
- Prediction gate blocks reveal before commit.
- Revealed state contains a real visual: chart, plot, SVG diagram, canvas, 2D
  scene, 3D scene, or equivalent interactive visual.
- Add `visual_quality` metadata in `simulation/runtime.yaml` and make
  `simulation.test.ts` call `expectProductSimulationReveal` or
  `expectRevealedSimulationVisual`.
- Direct manipulation visibly changes the model.
- Formula panel shows formula, legend, substitution, units, result, and plain
  language interpretation.
- Learner-facing UI must not mention package names, source paths, kernels, or
  implementation details.
- Use existing Paideia kernels first. Do not inline reusable math that belongs
  in core/*.
- If docs/product/core-foundation-gap-matrix.md says the domain is
  kernel-needed or design-needed, stop and ask for a kernel/design task before
  building the container.

Media:
- Use the THUMB, FALLBACK, INTRO, and 3D ASSETS prompts from
  PAIDEIA_CONTAINER_TABLES_V2.md as source direction.
- Generated images or videos may support thumbnails and explanation, but must
  not replace data-driven simulation visuals.

Safety:
- Cite sources in sources.md.
- Do not copy textbook content wholesale.
- Do not copy proprietary or GPL simulation code.
- If rebuilding inspiration from a non-compatible repository, use a clean-room
  process and document it in TECHNICAL.md.

Required checks:
```bash
pnpm container:validate <TARGET_CONTAINER_PATH>
pnpm container:docs <TARGET_CONTAINER_PATH>
pnpm graph:generate
pnpm graph:check
pnpm typecheck
pnpm lint
pnpm test
pnpm boundary
pnpm license:check
pnpm agent:validate
```

Pull request:
- Title: feat(<curriculum>): <Concept Title> product slice
- Include queue ID, target path, screenshots or short recording, commands run,
  accessibility result, sources, and known limitations.
- If any required command cannot run due to environment limitations, include the
  exact error and the focused replacement check you ran.
~~~

## Reviewer Prompt

Use this when asking another agent to evaluate the PR.

~~~text
Review this Paideia container PR as a strict evaluator.

Check:
- It builds exactly one queue item.
- The queue row was changed only from ready-for-build to in-build.
- The target path matches docs/product/container-table-queue.yaml.
- The container satisfies docs/container-spec.md.
- The container satisfies docs/product/container-quality-rubric.md.
- The simulation reveal has a visible chart, plot, SVG, canvas, 2D scene, 3D
  scene, or equivalent visual artifact.
- Formula panels include formula, legend, substitution, units, result, and
  interpretation.
- Learner-facing UI does not expose code, package, kernel, or file-path details.
- Reusable computation belongs in core/*.
- No cross-branch imports exist.
- Sources are cited and no incompatible code or content was copied.
- Tests are meaningful and include prediction-gate coverage.

Report findings as:
- P0: must fix before merge.
- P1: should fix before merge unless explicitly deferred.
- P2: polish or follow-up.

If there are no P0/P1 findings, say the PR is ready for maintainer review and
list residual risks.
~~~
