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

## Agent Entrypoint Map

Use this as the single router. Do not ask an agent to scan every hidden tool
folder before it knows the task.

| Agent or editor | First file | Then read | Why |
| --- | --- | --- | --- |
| Codex | `AGENTS.md` | `.agents/skills/<task>/SKILL.md` | Canonical Paideia skills live here. |
| Claude Code | `AGENTS.md` | `.claude/skills/<task>/SKILL.md` | This mirrors `.agents/skills` for Claude. |
| Cursor | `AGENTS.md` | `.cursor/rules/*.mdc` only when editing matching files | Cursor rules are short reminders, not the full spec. |
| Any agent building a lesson | `docs/container-spec.md` | target `container.yaml` and this guide | The container spec is the source of truth. |
| Any agent changing reusable code | target `core/<module>/AGENTS.md` | `.agents/skills/new-kernel/SKILL.md` | Each core module owns its public contract. |

Canonical sources:

| Source | Role |
| --- | --- |
| `docs/container-spec.md` | The lesson/container shape. |
| `docs/agent-workflows.md` | Task router and copy-paste prompts. |
| `.agents/skills/` | Main skill bodies. |
| `.claude/skills/` | Mirror of `.agents/skills/`. |
| `.codex/agents/` and `.claude/agents/` | Reviewer role wrappers. |
| `.cursor/rules/` | Lightweight editor hints that point back to the shared specs. |

Run `pnpm agent:validate` after changing any agent-facing instructions.

## Prompt: Build One Lesson

```text
You are building one Paideia lesson.

Target:
- Branch: <a-level | sutd>
- Subject or pillar: <subject-or-pillar>
- Concept id: <kebab-case-id>
- Title: <human title>

Read first:
- AGENTS.md
- docs/agent-workflows.md
- docs/container-spec.md
- docs/product/container-build-queue.yaml
- .agents/skills/new-container/SKILL.md
- .agents/skills/new-sim-in-container/SKILL.md
- .agents/skills/review-container/SKILL.md

Build only this lesson. Keep language student-facing. Show formulas with
substitution and units when calculations appear. Use existing core packages for
math, physics, controls, graphs, and the prediction gate.

Run:

pnpm container:validate
pnpm container:docs <container-path>
pnpm graph:generate
pnpm test
pnpm agent:validate

Open one PR with the lesson path, validation results, and any remaining
questions.
```

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
pnpm container:docs <container-path>
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
pnpm container:docs <container-path>
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

## If You Are Lost

Return to the task router at the top of this file. Pick one prompt, then read
only the files named by that prompt. If the work is not covered by a prompt,
start with `AGENTS.md` and ask for a narrower target before scanning the repo.

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
