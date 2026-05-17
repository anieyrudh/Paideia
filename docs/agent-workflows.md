# Agent Workflows

Paideia is designed so a non-technical contributor can fork the repository,
open it in Codex or Claude Code, and give a narrow prompt without pasting the
whole repo into context.

## Quick Start For Agent Users

1. Fork the repository and open the fork in your coding agent.
2. Paste one of the prompts below.
3. Let the agent read only the referenced contract files first.
4. Ask it to run the listed validation commands before opening a PR.

Use small prompts. A good prompt names one target, one outcome, and the exact
contracts to read. Avoid pasting large files that already exist in the repo.

## Prompt: Add A Container

```text
You are adding one Paideia container.

Target:
- Branch: <a-level | sutd>
- Subject: <subject>
- Concept id: <kebab-case-id>
- Title: <human title>

Read first:
- AGENTS.md
- docs/container-spec.md
- core/content-schema/src/index.ts
- .agents/skills/new-container/SKILL.md
- .agents/skills/review-container/SKILL.md

Use the new-container skill or `pnpm container:new` to scaffold. Fill only this
container. Do not edit unrelated containers or core packages. Run:

pnpm container:validate
pnpm graph:generate
pnpm -F @paideia/a-level-shell test

Open a PR with the container path, validation results, and remaining
NEEDS-VERIFICATION items.
```

## Prompt: Add A Sim To A Container

```text
You are adding one simulation to an existing Paideia container.

Target container:
- <branch>/content/<subject>/containers/<concept-id>

Read first:
- AGENTS.md
- docs/container-spec.md
- core/content-schema/src/index.ts
- .agents/skills/new-sim-in-container/SKILL.md
- core/prediction-gate/README.md
- testing/sim-harness/README.md

Use existing core kernels for math, plotting, graph layout, controls, and
runtime. Do not inline reusable math or bypass the prediction gate. Run:

pnpm container:validate
pnpm graph:generate
pnpm test

The sim test must assert that observation is blocked until prediction commit
when prediction is declared.
```

## Prompt: Add Or Change A Core Kernel

```text
You are implementing one Paideia core kernel.

Target:
- core/<module-name>

Read first:
- core/<module-name>/AGENTS.md
- core/shared/src/index.ts
- core/content-schema/src/index.ts
- core/prediction-gate/README.md if the module touches reveal flow
- .agents/skills/new-kernel/SKILL.md

Write only under core/<module-name>/ unless integration files explicitly need a
root project reference. Export exactly the public interface in AGENTS.md. Add
README.md, TECHNICAL.md, unit tests, and property tests where mathematical
invariants apply. Run:

pnpm -F @paideia/<module-name> build
pnpm -F @paideia/<module-name> test
pnpm typecheck
pnpm lint
pnpm boundary
pnpm license:check
```

## Prompt: Clean-Room Rebuild A Non-Friendly Dependency

Use this when a GPL/AGPL/LGPL or otherwise non-allowlisted repository has a
capability Paideia needs.

```text
You are working on a clean-room replacement for a non-friendly dependency.

Target capability:
- <capability>
- Original repo for benchmarking only: <url>
- Paideia target module/package: <path>

Read first:
- docs/dependency-clean-room.md
- LICENSES.json
- core/<target-module>/AGENTS.md if this is a kernel
- docs/container-spec.md if this is container-facing

Role for this Codex instance:
- <research | builder | evaluation>

Follow the role split in docs/dependency-clean-room.md. Research agents may
inspect the original repo and write benchmark/spec artifacts, but must not write
replacement code. Builder agents must implement only from the clean spec and
benchmarks, not the original source. Evaluation agents compare the replacement
against the committed benchmark suite and report gaps.

Run:

pnpm license:check
pnpm test
pnpm typecheck
```

## Where Agents Should Look

- Root orientation: `AGENTS.md`, `README.md`, `CONTRIBUTING.md`.
- Container shape: `docs/container-spec.md`.
- Clean-room dependency replacements: `docs/dependency-clean-room.md`.
- Product roadmap: `docs/product/container-roadmap.md`.
- Core contracts: `core/<module>/AGENTS.md`.
- Reusable skills: `.agents/skills/*/SKILL.md`.
- Claude mirror: `.claude/skills/*/SKILL.md`.
- Cursor rules: `.cursor/rules/*.mdc`.

## Keeping Docs Consistent

Run this before opening an agent-facing docs PR:

```bash
pnpm agent:validate
```

The validator checks that:

- `.agents/skills` and `.claude/skills` stay mirrored.
- skill files refer to the current v2 container paths.
- this guide and the product roadmap are present.

CI runs the same check in the lint job, so stale prompt instructions block
merge.
