# Contributing to Paideia

Paideia is open educational infrastructure. The doctrine — prediction gate, PMOE-T, own-the-kernels, local-first AI, AI-as-critic, build-first, falsifiability — is non-negotiable. The container shape is the API. Read [`AGENTS.md`](AGENTS.md) and [`docs/container-spec.md`](docs/container-spec.md) before you touch anything.

## Local setup

```bash
git clone https://github.com/Paideia/paideia.git
cd paideia
pnpm install
pnpm test            # vitest, all packages
pnpm typecheck       # tsc -b
pnpm container:validate
pnpm boundary        # cross-branch import check
pnpm license:check   # third-party license allowlist
```

Node 20+ and pnpm 9+ required. If `container:validate` fails on a clean clone, file a `bug` issue — the container shape must always be green on `main`.

## Branch naming

Use `feat/<phase>/<scope>/<id>` where:

- `<phase>` is `a` (Phase A · platform), `b` (Phase B · branches), `c` (Phase C · pilot), or `core` for cross-branch work.
- `<scope>` is the branch or core module: `a-level`, `sutd`, `core-sim-runtime`, `docs`, etc.
- `<id>` is a short kebab-case slug or an issue number.

Examples: `feat/a/core-sim-runtime/pmoet-state-machine`, `fix/b/a-level/shm-prediction-gate-leak`, `chore/core/license-check`.

## Scoping a PR

**One branch per PR.** Path-filtered CI runs only the workflows for paths you touched: a PR under `a-level/**` runs the A-Level suite; a PR under `sutd/**` runs the SUTD suite; a PR under `core/**` runs both, because every branch consumes core.

If you find yourself touching two branches in one PR (other than via `core/`), split it. The Anieyrudh Filter will flag conflated scopes as a P0.

## The Anieyrudh Filter (run before opening a PR)

Every PR runs the Filter (`core/aniegpt/aniegpt-system-prompt.md`). You run it locally first:

1. Paste the diff (or the relevant slice) into the Filter prompt.
2. Address every P0 before you push. Address every P1 in the PR or open a tracked issue.
3. Paste the resulting summary into the PR description AND into the `## Anieyrudh Filter pass` section of each container's `TECHNICAL.md` you touched.

Containers with an empty Filter section block merge. The `daily-compliance-audit.yml` workflow opens issues for any that slip through.

The Filter is a critic. It does not write content. You write the content; the Filter blocks bad shipments.

## Changing `core/` (the core change protocol)

`core/` modules are consumed by every branch. Breaking changes propagate. Therefore:

1. Open a `core-change-proposal` issue **before** writing code. Enumerate every current consumer, the current public interface, the proposed interface, what does NOT change, and the migration plan.
2. Get maintainer approval on the issue.
3. Open a PR. The PR must include changes to every affected branch's consumers in the same PR (or a documented migration sequence). Both branches' full test suites must be green.
4. Breaking changes use the `core!:` commit prefix and require an ADR under `docs/adr/`.

Single-write discipline: only the maintainer (currently @anieyrudh) merges to `core/`. CODEOWNERS enforces.

## The PR template

The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) asks for:

- **Branch** — a-level / sutd / core / docs (one).
- **Original outcome** — the natural-language ask in the author's own words. Preserves the original intent before it becomes diff-speak.
- **What this PR does** — concrete, not aspirational. One paragraph.
- **What AI did / what I rejected** — Agentic Presence requires you to name what AI contributed and what you turned down. The student/author remains the author of the reasoning.
- **Anieyrudh Filter pass** — checkbox that the Filter ran and the TECHNICAL.md section is non-empty.
- **Definition of Done** — tests, CI, validator, no orphan `[NEEDS-VERIFICATION]` flags, dual-branch CI for `core/` changes.
- **Linked issues** — `Closes #...`.

If a section doesn't apply, write "n/a" and a one-line reason. Do not delete sections.

## Commit conventions

Conventional Commits with branch scopes:

- `feat(a-level): add SHM container` — A-Level branch feature.
- `feat(sutd): add design-thinking primer` — SUTD branch feature.
- `feat(core): expose KernelResult.cache_key` — additive core change.
- `fix(core): correct PMOE-T transition guard` — non-breaking core fix.
- `core!: rename ConceptPackageSpec.items.sims` — breaking; requires ADR.
- `docs:`, `chore:`, `test:`, `refactor:` — as usual.

Pre-commit hook runs `pnpm lint && pnpm test && pnpm container:validate`. Do not bypass with `--no-verify`; if a hook fails, fix the cause.

## Scaffolding a container

```bash
pnpm container:new
```

Prompts for branch, subject, package id, title, primary interaction type. Produces the full canonical directory tree from `core/docs-templates/`. Do not hand-author the structure — compose your content into the shape.

To remix an existing container: `pnpm container:remix <source-id> <new-id>`. Attribution is auto-injected.

## License discipline

- **Code is MIT.** New code goes under `LICENSE`.
- **Content is CC-BY-4.0.** Concept cards, decision matrices, transfer problems, sources go under `LICENSE-content`.
- **No GPL deps bundled into runtime.** `LICENSES.json` is the allowlist; `pnpm license:check` enforces. GPL services (e.g., Argdown) are integrated via iframe and never bundled.
- **Provenance is mandatory.** If your work derives from PhET, an existing textbook example, or another open project, fill `provenance` in `concept-package.yaml` and cite in `sources.md`.

When in doubt, ask in Discussions or open an `escalation` issue. Don't invent.
