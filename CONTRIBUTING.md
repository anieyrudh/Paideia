# Contributing To Paideia

Paideia accepts small academic lessons and simulations as folders.

Most pull requests should add or improve exactly one folder under
`contributions/`.

## Fast Path

Copy:

```text
contributions/_template/
```

Create:

```text
contributions/<subject>/<your-slug>/
  manifest.yaml
  lesson.md
  simulation.html
  sources.md
  license.md
```

If you are unsure about the subject, start in:

```text
contributions/_incoming/<your-slug>/
```

Then run:

```bash
pnpm contribution:organize -- --write
pnpm contribution:validate
```

## What A Good Submission Does

- Explains one idea clearly.
- Uses student-facing language.
- Cites sources in `sources.md`.
- Records code/content provenance in `license.md`.
- If it is a simulation, shows a visual interactive model.
- Avoids copied textbook material, private student data, proprietary code, and
  GPL/AGPL/LGPL runtime code.

Text-only pages are welcome as lessons. Do not label them as simulations.

## AI-Assisted Submissions

You can use ChatGPT, Claude, Gemini, Codex, Claude Code, or another tool.

In the pull request, say:

- what the AI helped create;
- what you checked manually;
- what sources support the lesson;
- what license applies to any adapted material.

Use [AI simulation prompts](docs/public/ai-simulation-prompts.md) if you want a
copy-paste prompt.

## Local Checks

```bash
pnpm install
pnpm contribution:organize -- --check
pnpm contribution:validate
pnpm build:pages
```

The GitHub pull request workflow runs these checks again.

## Pull Request Rules

- One lesson or simulation package per PR.
- Include a screenshot or preview when possible.
- Cite sources.
- Fill in license/provenance notes.
- Keep server-side code out unless a maintainer explicitly approves it.
- Do not mix unrelated cleanup with a contribution package.

## Legacy Material

The old curriculum-container system is archived in
`archive/legacy-curriculum-system/`. Do not build new work there unless a
maintainer asks for a legacy recovery.
