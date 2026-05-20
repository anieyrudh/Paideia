# Paideia

Paideia is a public project for building better learning tools.

The goal is simple: take difficult ideas, turn them into small interactive
lessons, and make those lessons easy for teachers, students, and contributors
to improve.

You do not need to be a software engineer to help. If you can spot a confusing
topic, explain how a student gets stuck, check a source, sketch a better
diagram, or test a lesson, you can contribute.

## What This Project Builds

Each lesson focuses on one idea.

For example, a lesson on motion might include:

| Part | What the learner sees |
| --- | --- |
| Clear explanation | The idea in plain language, then the formal definition |
| Interactive model | Sliders, diagrams, motion, graphs, or decisions the learner can change |
| Prediction step | A question before the answer is revealed |
| Worked method | The formula, substitution, units, and reasoning used |
| Common mistakes | The wrong turns students often take, shown directly |
| Connections | What the idea depends on and what it unlocks next |

```mermaid
flowchart LR
  A["A confusing idea"] --> B["A clear explanation"]
  B --> C["A hands-on model"]
  C --> D["A worked method"]
  D --> E["A reusable lesson"]
```

## How To Start

You can help even if you do not write code. Pick the path closest to what you
want to do.

### I Have No Code Experience

Start with the public onboarding brief:
[Contributing without a coding background](docs/public/cfe-onboarding.html).
Good first contributions are spotting confusing explanations, checking whether
a diagram makes sense, trying a lesson as a learner, or listing the mistake a
student is likely to make.

### I Found A Learning Problem

Open a small issue using the [sim idea template](.github/ISSUE_TEMPLATE/sim-idea.md).
Describe the learner, the confusing idea, and what a good lesson should help
them notice. You do not need to propose code.

### I Want An Agent To Help Me

Use the copy-paste prompts in [Agent workflows](docs/agent-workflows.md).
They tell Codex, Claude Code, or another coding agent exactly what to read and
what to avoid. The point is to keep the task narrow enough that the agent can
make a useful pull request without wandering through the whole repository.

### I Want To Build A Container

Follow the [product-quality container prompt](docs/agent-workflows.md#prompt-build-one-product-quality-container).
A container is one complete learning unit: explanation, interactive model,
worked method, concept map, sources, tests, and review notes.

| If this sounds like you | Best next step |
| --- | --- |
| "I can explain this better." | Suggest a concept-card improvement. |
| "I can test lessons with students." | Try a reviewed container and report where the flow breaks. |
| "I can design diagrams or interactions." | Propose a clearer media or simulation direction. |
| "I can review quality." | Use the [review prompt](docs/agent-workflows.md#prompt-evaluate-one-container-pr). |

## What Is Ready Now

The first working path is A-Level Physics. It already has reviewed interactive
lessons for:

| Area | Status |
| --- | --- |
| Physical quantities and units | Reviewed |
| Scalars and vectors | Reviewed |
| Resolving vectors | Reviewed |
| Kinematics in one dimension | Reviewed |
| Forces and equilibrium | Reviewed |

The next recommended A-Level lesson is **work, energy, power**, because it
builds directly on force balance and motion.

SUTD also has first reviewed slices across several pillars:

| Pillar | First reviewed slice |
| --- | --- |
| Freshmore | Vector transformations |
| EPD | PID step response |
| ESD | Linear programming feasible region |
| CSD | Graph search and shortest paths |
| DAI | Trust calibration |

The next SUTD priority is a clean ASD **load path and daylight tradeoff** slice.

## How The Work Scales

Paideia can grow in parallel when each team or agent owns one small lesson at a
time and the shared checks stay green.

```mermaid
flowchart TB
  R["Build queue"] --> A["A-Level lesson"]
  R --> S["SUTD lesson"]
  R --> K["Shared math or science tool"]
  A --> Q["Review and tests"]
  S --> Q
  K --> Q
  Q --> M["Merge"]
```

Parallel work is safe when:

| Needed before a large wave | Current state |
| --- | --- |
| A clear build queue | Started in [container-build-queue.yaml](docs/product/container-build-queue.yaml) |
| One lesson per pull request | Working well |
| Shared tools for repeated math and simulations | Many core tools exist, more will be added as needed |
| Tests that catch broken lessons | In place for the current A-Level shell |
| Simple instructions for humans and AI agents | This README and [Agent workflows](docs/agent-workflows.md) are the entrypoints |

That means we can already run several focused builds at the same time. For a
large SUTD-wide wave, the next step is to seed the SUTD build queue and shell
with the first concepts for EPD, CSD, ESD, ASD, and Freshmore before assigning
many agents.

## For AI Coding Agents

Agents should not crawl the whole repository.

Use this order:

1. Read [AGENTS.md](AGENTS.md) for the short project rules.
2. Read [Agent workflows](docs/agent-workflows.md) for the exact prompt type.
3. Read only the files named by that prompt.
4. Work on one target.
5. Run the listed checks before opening a pull request.

The agent folders have different purposes:

| Folder | Purpose |
| --- | --- |
| `.agents/skills/` | Main reusable skills for agent workflows |
| `.claude/skills/` | Mirror of the same skills for Claude Code |
| `.codex/agents/` | Codex reviewer role definitions |
| `.claude/agents/` | Claude reviewer role definitions |
| `.cursor/rules/` | Cursor editor rules |

The single human-readable map is [docs/agent-workflows.md](docs/agent-workflows.md).
Run `pnpm agent:validate` to check that the agent instructions stay consistent.

## Safety Rules

These rules keep the project useful and legally simple:

| Rule | Why it matters |
| --- | --- |
| Cite sources | Learners and teachers need to check where claims came from. |
| Do not paste textbook chapters | Summarize, explain, and cite instead of copying. |
| Do not include private student data | Build examples with fictional or public data only. |
| Do not copy incompatible code | Avoid GPL, AGPL, LGPL, proprietary, or unclear simulation code in the product. |
| Keep AI in the assistant role | AI can draft, test, and critique; humans remain responsible for the lesson. |

## For Developers

```bash
pnpm install
pnpm test
pnpm container:validate
pnpm graph:check
pnpm agent:validate
```

Common tasks:

| Task | Command or guide |
| --- | --- |
| Add a lesson | `pnpm container:new` |
| Validate lessons | `pnpm container:validate` |
| Regenerate lesson docs | `pnpm container:docs <container-path>` |
| Check generated lesson graph | `pnpm graph:check` |
| Build the static Pages artifact | `pnpm build:pages` |
| Design simulation formula/readout UI | [Simulation presentation standard](docs/product/simulation-presentation-standard.md) |
| Follow the build roadmap | [Container roadmap](docs/product/container-roadmap.md) |
| Run a container wave | [Container wave runbook](docs/product/container-wave-runbook.md) |
| Understand hosting and licensing direction | [Hosting and licensing plan](docs/product/hosting-and-licensing.md) |

## Project Docs

- [Mission and governance](docs/README.md)
- [Agent workflows](docs/agent-workflows.md)
- [Container specification](docs/container-spec.md)
- [Product roadmap](docs/product/container-roadmap.md)
- [Container wave runbook](docs/product/container-wave-runbook.md)
- [Hosting and licensing plan](docs/product/hosting-and-licensing.md)
- [Simulation presentation standard](docs/product/simulation-presentation-standard.md)
- [Core module inventory](docs/core-modules.md)
- [GitHub setup](docs/github-setup.md)
- [Clean-room dependency guide](docs/dependency-clean-room.md)

## License

- Code: [MIT](LICENSE)
- Learning content: [CC-BY-4.0](LICENSE-content)
- Third-party notices: [NOTICE](NOTICE)

The proposed future direction is Apache-2.0 for code and CC-BY-SA-4.0 for
curriculum content. That requires a dedicated migration PR; the current license
files remain authoritative until then.
