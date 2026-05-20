# GitHub Setup

## Organisation

The intended organisation is `Paideia`, with Anieyrudh R as the initial owner.
Repository visibility is public.

## Repository Config

Repository: `Paideia/paideia`

Description: Open educational infrastructure. Concept-mastery learning across
institutions. Predict -> Manipulate -> Observe -> Explain -> Transfer.

Topics: `education`, `simulation`, `pmoe-t`, `open-curriculum`, `webgpu`,
`monorepo`.

## Top-Level Layout

- `core/` shared kernels, schemas, renderers, runtime, and templates.
- `a-level/` Singapore A-Level branch.
- `sutd/` SUTD Freshmore branch.
- `docs/` governance, architecture, ADRs, and generated coverage.
- `scripts/` local validation, coverage, license, and scaffolding tools.
- `.github/` workflows, templates, CODEOWNERS, and issue forms.

## Branch Protection On `main`

Require these status checks before merge: `typecheck`, `lint`, `test`,
`container-validate`, `boundary`, and `license-check`. Require one approval,
linear history, Copilot or reviewer comments as advisory only, and block
force-pushes.

## CODEOWNERS

`core/`, `.github/`, and `docs/` require Anieyrudh approval. Branch paths can
devolve to teacher or course leads after onboarding.

## Path-Filtered CI

CI is split by concern: typecheck/lint/test/container validation for every PR,
boundary checks for branch import rules, license checks for bundled runtime
dependencies, accessibility checks for catalogue apps, and scheduled compliance
or coverage workflows.

## Issue Templates

Issue templates route concept packages, sim specs, ideas, bugs, escalations,
ADRs, and core-change proposals into structured intake. Blank issues are
disabled.

## PR Template

Every PR records the original author outcome, concrete change, AI assistance
and rejected paths, Filter pass, Definition of Done, and linked issues.

## Org Project Board

Create one project board named `Paideia · active phase` with columns:
Backlog -> Ready -> In Progress -> In Review -> Done.

## Hosting

Use GitHub Pages for the first public product. Paideia should publish static
curriculum shells, generated graph data, media, and client-side simulations from
GitHub Actions. Add a backend only when a feature requires accounts, synced
progress, notebook execution, AI/API calls, or other server-owned state.

Configure Pages to deploy from GitHub Actions. The Pages workflow discovers
`<branch>/apps/shell` apps and publishes them under matching paths such as
`/a-level/` and `/sutd/`; new product slices appear after their generated graph
data lands on `main`.

See [Hosting and licensing plan](product/hosting-and-licensing.md).

## Discussions

Enable Discussions once external contributors arrive. Use issues for tracked
work and ADRs; use Discussions for open-ended teaching, design, and roadmap
conversation.

## Secrets

Set secrets with `gh secret set`. Keep OpenAI, deployment, analytics, and
backend tokens out of source control and local docs. GitHub Pages frontend code
must not contain secret keys.

## What Not To Enable

Do not enable auto-merge, bot auto-approve, merge commits, or multi-writer
changes to `core/` without explicit maintainer review.
