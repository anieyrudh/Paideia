# Mission And Governance

## What Paideia Is

Paideia is open educational infrastructure for concept-mastery learning across
institutions. It ships curriculum as container-shaped ConceptPackages: each
package owns one concept, its prediction gate, sims, concept card, transfer
work, assessments, citations, and technical audit trail.

## The Doctrine

1. **Prediction gate:** every observation-shaped sim must require a committed
   prediction before reveal.
2. **PMOE-T:** containers run Predict -> Manipulate -> Observe -> Explain ->
   Transfer at the container level.
3. **Own the kernels:** reusable math, rendering, state, and pedagogy logic
   belongs in `core/` packages with explicit contracts.
4. **Local-first AI:** learner state and draft authoring stay local unless a
   deliberate integration says otherwise.
5. **AI as critic:** the Anieyrudh Filter blocks weak work; it does not author
   student-facing truth on its own.
6. **Build-first:** demos must be runnable, tested, and inspectable before they
   are treated as design decisions.
7. **Falsifiability:** claims in concept cards, sources, and assessments need
   citations or a tracked `[NEEDS-VERIFICATION]` issue.

## Governance Roles

- **Maintainer:** Anieyrudh R owns repository direction, `core/` contracts,
  branch protection, licensing, and final merge calls.
- **Executor:** an agent or contributor implementing a scoped issue or PR.
- **Branch lead:** teacher or course lead responsible for an institution branch
  such as `a-level/` or `sutd/`.
- **Contributor:** anyone proposing content, code, issues, reviews, or docs.
- **Advisor:** subject or pedagogy reviewer who signs off on published
  containers.

## Escalation

Use the 1-day block rule. If work is blocked for a day, open an escalation issue
with the blocker, at least three things tried, the Anieyrudh Filter output, and
the decision needed from @anieyrudh.

## Adding A New Branch

New institutional branches require an ADR, a new top-level folder, a
`pnpm-workspace.yaml` entry, CODEOWNERS coverage, and path-filtered CI. Shared
logic still goes through `core/`; branch folders must not cross-import.

## Versioning

Branch releases use branch tags such as `alevel-v0.1` and `sutd-v1.0`. Commits
use Conventional Commits with branch scopes, for example `feat(a-level): ...`
or `feat(sutd): ...`. Breaking shared API changes use `core!:` and require an
ADR plus migration plan.

## Licensing

Code is MIT. Curriculum, concept cards, decision matrices, and sources are
CC-BY-4.0. Third-party notices live in `NOTICE`, and bundled runtime dependency
licenses must pass `LICENSES.json`.

## Where To Read Next

- [Container specification](container-spec.md)
- [Core module inventory](core-modules.md)
- [GitHub setup](github-setup.md)
- [Anieyrudh Filter](../core/aniegpt/aniegpt-system-prompt.md)
- [Contributing guide](../CONTRIBUTING.md)
