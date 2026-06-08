# Paideia Agent Map

Paideia is now a simple static library of academic contribution packages.

Active architecture:

```text
contributions/<subject>/<slug>/ -> validation scripts -> GitHub Pages gallery
```

The old curriculum/kernel system is archived under
`archive/legacy-curriculum-system/` and should not be used for new work unless
the user explicitly asks for legacy recovery.

## Build Commands

- `pnpm install` - install root dependencies.
- `pnpm contribution:organize -- --check` - verify package bucket paths.
- `pnpm contribution:organize -- --write` - move `_incoming` packages into their canonical bucket.
- `pnpm contribution:validate` - validate contribution shape, sources, license notes, and basic simulation presence.
- `pnpm build:pages` - build the static gallery into `dist/pages`.
- `pnpm test` - run the contribution organize and validate checks.
- `pnpm lint` - syntax-check the active scripts.

## Active Files To Read

- `README.md`
- `CONTRIBUTING.md`
- `docs/public/contribution-packages.md`
- `docs/public/contribution-intake-workflow.md`
- `docs/public/ai-simulation-prompts.md`
- `scripts/build-pages.mjs`
- `scripts/organize-contributions.mjs`
- `scripts/validate-contributions.mjs`

## Hard Rules

- Keep the active project simple.
- Do not reintroduce kernels, curriculum routes, generated graphs, or heavy monorepo gates.
- One contribution package per PR unless the user asks for a larger import.
- Simulation packages need a visible interactive surface in `simulation.html`.
- Cite sources in `sources.md`.
- Fill `license.md`.
- Do not paste copyrighted textbook chapters.
- Do not bundle proprietary, GPL, AGPL, or LGPL runtime code.
- If a useful source is not license-compatible, cite it and write an original explanation instead of copying it.

## Commits

Use conventional commits:

- `docs: ...`
- `feat(contributions): ...`
- `fix(contributions): ...`
- `chore: ...`

## Legacy Archive

The archived system is reference material only:

```text
archive/legacy-curriculum-system/
```

Do not move archived files back into the active tree without a specific user
request.
