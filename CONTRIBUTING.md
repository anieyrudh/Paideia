# Contributing To Paideia

Paideia is a public library for academic simulations and lesson materials.
Contributions should be easy to review, easy to run, and safe for teachers and
learners to reuse.

You can contribute in two ways:

1. **Simple contribution package** under `contributions/<subject>/<slug>/`.
2. **Full Paideia container** under `a-level/`, `sutd/`, or `shared/`.

Most new contributors should start with the simple package format.

## Fast Path: A Contribution Package

Copy the template:

```text
contributions/_template/
```

Then create:

```text
contributions/<subject>/<your-slug>/
  manifest.yaml
  lesson.md
  simulation.html
  preview.png
  sources.md
  teacher-notes.md
  license.md
```

Read [the contribution package guide](docs/public/contribution-packages.md) for
the manifest fields and review checklist.

## What A Good Simulation Must Do

- Show a visible model: chart, diagram, graph, animation, canvas, SVG, map, or
  equivalent.
- Let the learner manipulate something.
- Give immediate feedback when controls change.
- Use student-facing language.
- Cite sources.
- Include formulas with formula, substitution, units, result, and legend when
  formulas matter.
- Avoid copied textbook material, proprietary code, and GPL/AGPL/LGPL runtime
  dependencies.

Text-only "simulations" are not accepted as simulations. Submit them as lesson
packs instead.

## AI-Assisted Contributions

It is fine to use ChatGPT, Claude, Gemini, Codex, Claude Code, or another tool.
Record what AI helped with in the pull request.

Use [AI simulation prompts](docs/public/ai-simulation-prompts.md) to generate
output that matches this repository's expected shape.

You remain responsible for:

- checking sources;
- checking license compatibility;
- testing the simulation in a browser;
- removing hallucinated facts;
- making the visible copy understandable to learners.

## Full Paideia Containers

Full containers are the advanced path. They are appropriate when a contribution
needs generated curriculum routes, strict runtime tests, shared kernels, or
featured-quality review.

Read:

- [AGENTS.md](AGENTS.md)
- [docs/container-spec.md](docs/container-spec.md)
- [docs/agent-workflows.md](docs/agent-workflows.md)
- [docs/quality/visual-simulation-standard.md](docs/quality/visual-simulation-standard.md)

Containers should still be one concept per pull request.

## Local Setup

```bash
git clone https://github.com/anieyrudh/Paideia.git
cd Paideia
pnpm install
pnpm test
pnpm typecheck
pnpm container:validate
pnpm graph:check
pnpm license:check
```

Node 20+ and pnpm 10+ are expected.

## Pull Request Rules

- Keep one lesson, simulation, or container per PR.
- Do not mix unrelated cleanup into a contribution.
- Include screenshots or a preview image when possible.
- Cite sources in `sources.md`.
- Fill in `license.md`.
- If AI helped, say what it did and what you checked manually.
- If a check fails, explain whether it is a real issue or an environment-only
  failure.

## Licensing

Current repository licenses:

- Code: MIT.
- Learning content: CC-BY-4.0.

Do not paste copyrighted textbook material. Do not copy simulation code from
PhET, commercial products, Stack Overflow answers, or other projects unless the
license permits reuse and the source is cited.

If a source is useful but not license-compatible, describe the idea in your own
words, cite the source, and do not copy implementation code.

## When In Doubt

Open an issue first. A useful issue can be as simple as:

- the topic;
- the learner level;
- what students misunderstand;
- what an ideal simulation would let them manipulate and observe.
