# Mission And Governance

## What Paideia Is

Paideia is an open library for academic simulations and lesson materials.

The repository has two contribution layers:

1. **Contribution packages:** lightweight lesson and simulation folders under
   `contributions/`.
2. **Full containers:** stricter curriculum units under `a-level/`, `sutd/`,
   and `shared/`.

The public product should feel like a searchable GitHub-native library for
academic simulations: easy to contribute to, easy to review, and easy to publish
through GitHub Pages.

## Doctrine

1. **Visible simulations first:** if something is called a simulation, the
   learner should see a real visual model immediately. Prediction is a
   reflection checkpoint, not a blocker.
2. **One concept at a time:** small focused contributions are easier to review
   than large curriculum dumps.
3. **Sources matter:** formulas, claims, datasets, and adapted ideas need
   citations.
4. **License clarity:** do not copy incompatible code or copyrighted textbook
   material. Record provenance.
5. **Student-facing language:** public pages should not expose raw queue IDs,
   package names, or internal agent language.
6. **Reusable foundations:** when full containers need shared domain logic, put
   that logic in `core/` kernels instead of inlining it in one route.
7. **AI as assistant and critic:** AI may draft, code, test, or review, but
   humans remain responsible for factual, licensing, and pedagogical quality.

## Governance Roles

- **Maintainer:** owns repository direction, licensing, branch protection, and
  final merge calls.
- **Contributor:** proposes lesson packs, simulations, docs, code, issues, or
  reviews.
- **Reviewer:** checks pedagogy, source quality, UI/UX, accessibility, and
  license risk.
- **Agent:** Codex, Claude Code, or another AI coding assistant working from a
  scoped prompt.

## Contribution Status

| Status | Meaning |
| --- | --- |
| `draft` | Valid enough to discuss and review. |
| `reviewed` | Runs, cites sources, and is usable. |
| `featured` | Strong pedagogy, polished interaction, and teacher-ready support. |

## Adding New Work

Use the lightest path that fits:

| Need | Path |
| --- | --- |
| Submit a standalone sim or lesson | `contributions/<subject>/<slug>/` |
| Add a full curriculum slice | full container under `a-level/`, `sutd/`, or `shared/` |
| Add reusable math/science logic | `core/<kernel>/` with a package contract |
| Ask for help | GitHub issue or discussion |

## Licensing

Current repository licenses:

- Code: MIT.
- Learning content: CC-BY-4.0.

The proposed future direction is Apache-2.0 for code and CC-BY-SA-4.0 for
curriculum content. That is a migration plan, not the current effective license;
see [Hosting and licensing plan](product/hosting-and-licensing.md).

## Where To Read Next

- [Contribution packages](public/contribution-packages.md)
- [AI simulation prompts](public/ai-simulation-prompts.md)
- [Container specification](container-spec.md)
- [Visual simulation standard](quality/visual-simulation-standard.md)
- [Visual exemplar gallery](quality/visual-exemplar-gallery.md)
- [Agent workflows](agent-workflows.md)
- [Core module inventory](core-modules.md)
- [Reuse boundaries and clean-room rewrites](reuse-boundaries.md)
- [GitHub setup](github-setup.md)
