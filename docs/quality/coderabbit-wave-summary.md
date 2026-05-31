# CodeRabbit Wave Summary

This note records the highest-frequency review issues from the SUTD healthcare
container wave and maps them to checks that should run before merge.

## Why Integration Took So Long

The healthcare wave was seven product containers at once. Every PR touched the
same narrow integration files: `sutd/packages/sims/package.json`,
`sutd/packages/sims/tsconfig.json`, package exports, generated knowledge graph
data, generated sim registry data, and the build queue. That creates repeated
rebases even when each individual container is correct.

CodeRabbit also ignores generated files by path filter, so generated graph
freshness has to be owned by CI. The late stale-graph failure on the cancer
container is exactly why `pnpm graph:check` needs to stay in the required gate.

Finally, CodeRabbit sometimes ran before slower CI results were available or
hit tool/rate limits. That makes it useful as a reviewer, but not sufficient as
the only P0/P1 filter.

## Frequent Findings

| Pattern | Examples from the wave | Gate or response |
| --- | --- | --- |
| Generated registry or knowledge graph drift | Cancer container required a second graph refresh after content fixes. | `pnpm graph:check` remains required in CI. |
| Review-only prompt metadata embedded in learner prompts | `commit_format`, `correct_index`, or `rationale_required` text can accidentally be included in a prompt block. | `pnpm container:quality` now rejects metadata-looking lines inside prediction prompts. |
| Unsafe display casts in sim packages | `as unknown as number` appeared in student-facing readouts for branded kernel values. | `pnpm container:quality` rejects `as unknown as number` in curriculum/shared sim package source. |
| Prediction-checkpoint tests too weak | Some tests committed a prediction without proving the live model remained visible. | `pnpm container:quality` requires non-legacy tests to use the product simulation experience helper or equivalent checkpoint coverage. |
| Kernel edge cases altered by UI glue | Membrane simulation clamped potassium permeability to `1e-9`, preventing true zero permeability. | Fixed in code; future agent prompts should say UI coercion must preserve valid kernel boundary cases. |
| Unit tests describe a different invariant than they assert | Cancer test title said response at IC50 but asserted response at `2 x IC50`. | Fixed in code; keep test names literal and formula-specific. |
| Missing property tests for deterministic evidence helpers | CodeRabbit repeatedly asked for `fast-check` on closed-form sim evidence. | Added cancer evidence property tests; future gate can require `fast-check` for exported `*Evidence` helpers once legacy packages are backfilled. |
| Package-level barrel growth | New sims often append root `src/index.ts` exports, increasing conflict surface. | Keep subpath exports as the stable import path; consider a future guard once all consumers are moved off root barrels. |
| Overdeclared or unused kernel dependencies | Several YAML specs listed broad kernels that were not consumed directly. | Keep as a review item for now; a future import-vs-`kernel_deps` checker can make this mechanical. |

## Current CI Additions

`pnpm container:quality` is now part of the `container-validate` GitHub Actions
job. It currently checks:

- no structured prediction metadata accidentally embedded inside learner prompt
  text;
- no `as unknown as number` casts in curriculum/shared sim package source;
- non-legacy prediction-checkpoint tests prove the live observation stays visible
  while the checkpoint saves learner reflection.

These gates are intentionally conservative. They target patterns already seen
in merged or reviewed PRs without requiring every legacy container to be
rewritten in the same PR.

## Follow-Up Gates

- Add an import-vs-`kernel_deps` consistency checker after existing containers
  are normalized.
- Add a `fast-check` presence rule for exported deterministic `*Evidence`
  helpers after current package tests are backfilled.
- Reduce merge conflicts by discouraging root package barrels for new sims and
  relying on package subpath exports.
- Keep CodeRabbit path filters documented: generated files and lockfiles still
  need first-party CI gates because CodeRabbit may not inspect them.
