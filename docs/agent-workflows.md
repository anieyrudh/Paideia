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
| Any agent changing existing reusable code | target `core/<module>/AGENTS.md` | `.agents/skills/new-kernel/SKILL.md` | Each core module owns its public contract. |
| Any agent creating a missing kernel contract | `docs/agents/kernel-wave-runbook.md` | `.agents/skills/new-kernel/SKILL.md` | Missing contracts must be designed before implementation. |

Canonical sources:

| Source | Role |
| --- | --- |
| `docs/container-spec.md` | The lesson/container shape. |
| `docs/agent-workflows.md` | Task router and copy-paste prompts. |
| `docs/agents/kernel-wave-runbook.md` | Contract-first process for missing `core/<kernel>/AGENTS.md`. |
| `.agents/skills/` | Main skill bodies. |
| `.claude/skills/` | Mirror of `.agents/skills/`. |
| `.codex/agents/` and `.claude/agents/` | Reviewer role wrappers. |
| `.cursor/rules/` | Lightweight editor hints that point back to the shared specs. |

Run `pnpm agent:validate` after changing any agent-facing instructions.

## Prompt: Build One Product-Quality Container

```text
You are building one product-quality Paideia container.

Target:
- Branch: <a-level | sutd | shared>
- Subject, pillar, or discipline: <subject-or-pillar-or-discipline>
- Concept id: <namespaced-id from docs/product/container-build-queue.yaml>
- Title: <human title>
- Container path: <branch>/content/<subject-or-pillar-or-discipline>/containers/<slug>

Read first:
- AGENTS.md
- docs/agent-workflows.md
- docs/container-spec.md
- docs/product/container-build-queue.yaml
- docs/product/container-wave-runbook.md
- docs/product/container-roadmap.md
- README.md
- .agents/skills/new-container/SKILL.md
- .agents/skills/new-sim-in-container/SKILL.md
- .agents/skills/review-container/SKILL.md
- core/prediction-gate/README.md
- core/sim-runtime/README.md
- core/ui-sim/README.md

Build only this container. Keep language student-facing; do not expose package
names, file paths, kernel names, or implementation details in the learner UI.
Show formulas with substitution and units when calculations appear. Use the
simulation presentation standard for LaTeX formula blocks, color-coded symbol
legends, and browser playtest expectations. Use the
`kernel_dependencies` listed in the build queue; do not inline reusable math,
physics, graph, control, probability, or state logic in the container.

After syncing or rebasing onto `main`, run `pnpm install` before typecheck or
package tests so newly added workspace packages are linked.

Path rule:
- `a-level.*` queue ids live under `a-level/content/<subject>/containers/<slug>`.
- `sutd.*` queue ids live under `sutd/content/<pillar>/containers/<slug>`.
- `shared.*` queue ids always live under `shared/content/<discipline>/containers/<slug>`.
  Never place a `shared.*` queue item inside `a-level/` or `sutd/`; curriculum
  wrappers can link to shared-core containers later.

Required outcome:
- Valid v2 container layout.
- `container.yaml`, `concept-card.md`, `sources.md`, `TECHNICAL.md`.
- `concept-map/`, `simulation/`, `problem-solving/`, `media/`, and `embed/`.
- A live-first simulation with an embedded prediction checkpoint when the
  concept is sim-worthy.
- Formula-backed readouts for any calculation.
- Playwright tests proving the model is visible on first load, the prediction
  checkpoint saves reflection, at least one manipulation changes visible state,
  and the observation state has no critical axe accessibility violations.
- `TECHNICAL.md` records what failed, what was fixed, and what remains deferred.

Run:

pnpm install
pnpm container:validate
pnpm container:docs <container-path>
pnpm graph:generate
pnpm graph:check
pnpm test
pnpm typecheck
pnpm lint
pnpm boundary
pnpm agent:validate

Open one PR. The PR body must include the container path, the build-queue entry
id, the kernels used, validation results, screenshots or a short visual smoke
test note, and any remaining deferred issues.
```

## Prompt: Build One Lesson

Use the product-quality container prompt above. "Lesson" and "container" mean
the same unit of work in Paideia; the stricter prompt prevents partial demos
from being mistaken for finished product slices.

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
runtime. Do not inline reusable math or bypass the prediction checkpoint. Run:

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

## Prompt: Evaluate One Container PR

Use this when reviewing a product-slice pull request before merge.

```text
You are evaluating one Paideia container PR. Review deeply; do not merge unless
P0 and P1 issues are resolved.

Target:
- PR: <number or URL>
- Container path: <branch>/content/<subject-or-pillar>/containers/<slug>
- Build-queue id: <id from docs/product/container-build-queue.yaml>

Read first:
- AGENTS.md
- docs/container-spec.md
- docs/product/container-build-queue.yaml
- .agents/skills/review-container/SKILL.md
- testing/sim-harness/README.md
- target container's container.yaml, concept-card.md, sources.md, TECHNICAL.md,
  simulation/simulation.yaml, simulation/*.test.ts, and package sim source.

Review checklist:
- Container shape matches docs/container-spec.md.
- Public learner UI is student-facing and does not expose code/package details.
- Every calculation shows formula, substitution, units, and interpretation.
- Simulation uses the build queue's required core kernels instead of local math.
- Prediction checkpoint saves reflection without blocking the simulation.
- At least one manipulation changes visible state.
- Live sim has no critical axe accessibility violations.
- Sources support the claims and there are no copied textbook dumps.
- TECHNICAL.md records failures, fixes, and deferred issues.

Run:

pnpm container:validate <container-path>
pnpm graph:generate
pnpm graph:check
pnpm test
pnpm typecheck
pnpm lint
pnpm boundary
pnpm license:check
pnpm agent:validate

Report findings first, ordered P0, P1, P2, with file/line references where
possible. If there are no P0/P1 findings and all gates pass, say it is safe to
merge.
```

## Prompt: Docs Owner

Use this when public onboarding docs, README wording, or agent-facing workflow
docs need to stay clear and synchronized.

```text
You are the Paideia docs owner for this PR. Your job is to keep public docs
human-friendly and agent docs precise.

Read first:
- README.md
- docs/public/README.md
- docs/public/cfe-onboarding.html
- docs/agent-workflows.md
- docs/product/container-roadmap.md
- docs/product/container-build-queue.yaml
- scripts/validate-agent-docs.mjs

Public docs standard:
- The first screen is for a non-technical reader.
- Use plain language, short sections, tables, and diagrams where helpful.
- Avoid unexplained jargon. When a technical term is necessary, define it once.
- Give clear paths for: "I have no code experience", "I found a learning
  problem", "I want an agent to help me", and "I want to build a container".
- Include the safety box: cite sources, no copied textbook dumps, no
  GPL/proprietary sim code, MIT code / CC-BY content, clean-room process when
  needed.

Agent docs standard:
- Point agents to AGENTS.md, docs/container-spec.md, the build queue, and one
  skill or prompt for the task.
- Keep prompts narrow: one container, one kernel, or one review.
- Do not duplicate long specs that already live elsewhere.

Run:

pnpm roadmap:validate
pnpm agent:validate
pnpm lint

Report changed docs, any broken links or stale references found, and the exact
validation results.
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
