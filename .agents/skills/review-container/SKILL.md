---
name: review-container
description: Run the full pre-PR review pass on a container — validator, container-auditor, sim-architect, pedagogy-reviewer, then regenerate README.md and TECHNICAL.md with the Anieyrudh Filter pass section filled. Use before opening a PR for a container change.
disable-model-invocation: false
---

# review-container

The full pre-PR review battery. Run before opening a PR that touches a container.

## When to invoke

- "review container <package-id>"
- "/review-container"
- Before pushing container work for review.

## Inputs

A container path. If absent, infer from `git diff --name-only` against the base branch and pick the unique container touched. If multiple containers are touched, run the review once per container.

## Procedure

### 1. Structural gate

```
pnpm container:validate <path>
```
If this fails, **stop**. The container shape is broken; fix it before going further. Anything else this skill does is wasted effort on a malformed container.

### 2. Spawn the three reviewer subagents in parallel

Invoke as subagents (separate contexts):
- `container-auditor` — layout, cross-refs, prediction-gate token, TECHNICAL.md Filter section.
- `sim-architect` — kernel boundaries, type discipline, Zod at boundaries, SimulationSpec validity.
- `pedagogy-reviewer` — PMOE-T completeness, prediction-gate Playwright assertion, misconception map, first-principles ordering, Socratic explain, a11y.

Each returns a structured P0/P1/P2 report.

### 3. Aggregate findings

Build a single table:

```
# review-container · <package-id>

## Verdicts
- container-auditor: <PASS | BLOCK>
- sim-architect:    <PASS | BLOCK>
- pedagogy-reviewer:<PASS | BLOCK>

## P0 (MUST fix before merge)
- [container-auditor] ...
- [sim-architect] ...
- [pedagogy-reviewer] ...

## P1 (address or explicitly defer in TECHNICAL.md Iteration log)
- ...

## P2 (advisory)
- ...
```

### 4. Anieyrudh Filter pass

If any P0 remains, **HALT** and prompt the user:
> P0 issues remain. The Anieyrudh Filter pass cannot be recorded as green. Address them and re-run `/review-container`.

If only P1/P2 remain, the user MAY proceed but must record their disposition.

Open or update `TECHNICAL.md`'s `## Anieyrudh Filter pass` section with:

```
## Anieyrudh Filter pass

Date: <YYYY-MM-DD>
Reviewers (subagents): container-auditor, sim-architect, pedagogy-reviewer

### P0 resolved
- <item> — resolution: <commit sha / explanation>

### P1 addressed or deferred
- <item> — <addressed in <commit> | deferred to issue #<n> because <one sentence>>

### P2 noted
- <item>
```

Also update `container.yaml`:
```yaml
filter_pass:
  date: <YYYY-MM-DD>
  p0_issues_resolved: true
  p1_issues_addressed_or_deferred: true
  output_in_technical_md: true
```

### 5. Regenerate README.md and TECHNICAL.md

Re-run the docs generator against the now-final manifest so the descriptive doc and the technical doc reflect the as-shipped state. Preserve hand-edited sections of TECHNICAL.md outside the auto-generated regions; the Filter pass section is authoritative and must not be clobbered.

### 6. Final validator pass

```
pnpm container:validate
pnpm --filter <pkg> typecheck
pnpm --filter <pkg> test --run
```

All must be green.

### 7. Print a one-screen summary the user can paste into the PR description.

## Refuse to do

- Do not mark Filter pass green while any P0 is open.
- Do not edit content/pedagogy to make a reviewer happy — surface the finding; the author decides.
- Do not skip regenerating README/TECHNICAL on the grounds that "nothing important changed."
