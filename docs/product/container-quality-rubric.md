# Container Quality Rubric

This rubric defines the minimum bar for a Paideia container before it is merged.
It applies to every curriculum branch and every contributor, including agent
authored work.

## Merge Rule

A container is mergeable only when it is structurally valid, educationally
useful, visually explorable, source-backed, accessible, and compatible with the
generated shell data.

One pull request should build exactly one container unless a maintainer asks for
a different scope.

## Required Surfaces

| Surface | Required evidence |
| --- | --- |
| `container.yaml` | Stable concept ID, title, curriculum mapping, subject or module, level, aliases when useful, authoring metadata, review state, changelog, declared kernels, declared component paths |
| `concept-card.md` | First-principles explanation, key definitions, why it matters, canonical examples, common misconceptions |
| `concept-map/` | `concept-map.yaml`, `mindmap.md`, `graph.mmd`, prerequisites, downstream links, sibling concepts, misconception graph |
| `simulation/` | Required for sim-worthy concepts; includes runtime, controls, presets, state labels, prediction gate when declared, and an executable or contract test |
| `problem-solving/` | Stepwise algorithm, strategy tree, proof outline, decision procedure, and declared transfer problem files |
| `embed/` | `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy` contract |
| `media/` | Thumbnail and fallback visual; image, animation, or 3D prompts may be included as source material |
| `sources.md` | Curriculum references and external sources; no copied textbook dumps |
| `README.md` | Human-facing summary of the container and how to run or review it |
| `TECHNICAL.md` | Kernel boundary, tests run, accessibility result, Anieyrudh Filter pass, known limitations |

## Simulation Standard

Text-only reveal states are not product-quality simulations.
See `docs/quality/visual-simulation-standard.md` and
`docs/quality/visual-exemplar-gallery.md` for the enforceable reveal contract
and approved visual patterns.

Every sim-worthy container must include:

| Requirement | Acceptance bar |
| --- | --- |
| Prediction gate | Reveal is blocked until the learner commits a prediction |
| Direct manipulation | Sliders, drags, toggles, presets, or other inputs visibly change the model |
| Visual model | Revealed state contains a real chart, plot, SVG diagram, canvas, 2D scene, 3D scene, or equivalent interactive visual artifact |
| Formula panel | Formula, substitution, units, result, interpretation, and nearby legend |
| Misconception target | At least one common misconception is made testable or visible |
| Transfer | One problem outside the canonical example checks whether the concept transfers |
| Accessibility | Keyboard path, labels, visible focus, contrast, and axe scan for serious or critical issues |

## Formula Standard

Every calculation shown to a learner must show how the result was produced.

| Item | Required |
| --- | --- |
| Formula | Render clearly, preferably with LaTeX-compatible notation |
| Legend | Define each symbol near the formula |
| Substitution | Show actual values with units |
| Result | Show rounded result with units |
| Interpretation | Explain what the result means in plain language |
| Colour link | Match formula variables to graph/diagram/readout colours when useful |

## Compatibility Standard

| Boundary | Rule |
| --- | --- |
| Shell metadata | Curriculum shells consume generated graph data; do not hand-code container metadata in the shell |
| Kernel ownership | Reusable maths, physics, CS, statistics, optimisation, circuits, or control logic belongs in `core/*`; sims call kernels |
| Branch imports | `a-level/**` must not import from `sutd/**`; `sutd/**` must not import from `a-level/**` |
| Shared concepts | Concepts reusable across curricula should live in `shared/content/...`; curriculum folders should wrap, map, assess, and localise |
| Foundation readiness | A queue item may be assigned only when `core-foundation-gap-matrix.md` marks its domain `ready`, or its PR also lands the missing kernel first |
| Runtime dependencies | No GPL, AGPL, LGPL, or proprietary runtime dependency without maintainer approval |
| Generated artifacts | Run graph generation after adding or changing a container |

## Required Commands

Run the narrow checks first, then the full suite.

```bash
pnpm container:validate <container-path>
pnpm container:docs <container-path>
pnpm graph:generate
pnpm graph:check
pnpm typecheck
pnpm lint
pnpm test
pnpm boundary
pnpm license:check
pnpm agent:validate
```

If a command cannot run because of the local environment, record the exact
failure in the PR and run the closest focused replacement.

## Reviewer Checklist

| Severity | Blocks merge? | Examples |
| --- | --- | --- |
| P0 | Yes | Invalid container shape, missing prediction gate, no revealed visual for sim-worthy concept, cross-branch import, GPL runtime code, uncited copied content |
| P1 | Yes unless explicitly deferred | Incorrect formula, weak tests, missing formula legend, inaccessible controls, shell graph drift, local math that belongs in `core/*` |
| P2 | No, but should be tracked | Better wording, extra preset, richer thumbnail, additional transfer example |

## Evidence Expected In PR

- Queue ID and container path.
- Screenshot or short recording of the revealed simulation state.
- Commands run and results.
- Accessibility result.
- Source list.
- Known limitations.
- Confirmation that no unrelated queue rows or containers were changed.
