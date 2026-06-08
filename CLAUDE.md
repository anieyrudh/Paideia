# CLAUDE.md

Read `AGENTS.md` first.

This repository is now intentionally simple. New work should target
`contributions/<subject>/<slug>/` packages and the static gallery.

Do not use the archived curriculum/kernel system unless the user explicitly
asks for legacy recovery:

```text
archive/legacy-curriculum-system/
```

For package work, read:

- `docs/public/contribution-packages.md`
- `docs/public/contribution-intake-workflow.md`
- `docs/public/ai-simulation-prompts.md`

Run:

```bash
pnpm contribution:organize -- --check
pnpm contribution:validate
pnpm build:pages
```
