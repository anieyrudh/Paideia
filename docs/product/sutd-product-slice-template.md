# SUTD Product Slice Template

Use this template before running a broad SUTD build wave. The goal is one
product-quality slice per PR, not a pillar-wide batch in one branch.

## When SUTD Can Run At Scale

Run a large SUTD wave only when these are true:

| Gate | Required state |
| --- | --- |
| Build queue | The target appears in `docs/product/container-build-queue.yaml`. |
| Shell route | The SUTD shell can show the target id or the pillar cluster that owns it. |
| Core dependencies | Every declared `core/<module>` exists and has tests. |
| Sim runtime | Every interactive sim declares and uses `core/sim-runtime`. |
| Scope | One PR owns one lesson container and same-branch integration only. |
| Review | Container, simulation, pedagogy, and accessibility checks are run before PR. |

Freshmore, EPD, ESD, and CSD can start first because their first slices use
existing core kernels. ASD, DAI, and SMT can also start if they stay within the
scoped first slices in the build queue; broader domain-specific sims should wait
for their missing domain kernels.

## One-Slice Contract

Every SUTD product slice must include:

| Surface | Expectation |
| --- | --- |
| `container.yaml` | Stable id, SUTD pillar/module mapping, dependencies, status, review gate. |
| `concept-card.md` | First-principles explanation, definitions, examples, misconceptions. |
| `concept-map/` | Prerequisites, downstream links, misconception graph, Mermaid source. |
| `simulation/` | Main explorable with prediction, controls, presets, state labels, tests. |
| `problem-solving/` | Stepwise method and at least one transfer problem/rubric. |
| `media/` | Thumbnail and fallback visual. |
| `embed/` | `load`, `saveState`, `score`, `resume`, `syncTheme`, `destroy`. |
| `README.md` / `TECHNICAL.md` | Generated or regenerated; Filter section non-empty before review. |

## Student Experience Bar

- The first route is the learning experience, not a marketing page.
- The learner predicts before the observation/formula is revealed when prediction is declared.
- Controls use student-facing labels, presets, and visible causal feedback.
- Any calculation shows formula, substituted values, signs, units, final value, and interpretation.
- The UI hides code/package/file names from students.
- Sources are cited; no copied textbook dumps or incompatible source code.

## Prompt Template

```text
You are building one SUTD Paideia product slice.

Repo: Paideia/paideia
Base branch: main
Create branch: codex/sutd-<pillar>-<concept-id>

Target:
- Pillar: <Freshmore | EPD | ESD | CSD/ISTD | ASD | DAI | SMT>
- Queue id: <id from docs/product/container-build-queue.yaml>
- Title: <title from queue>
- Expected container path: sutd/content/<pillar-or-subject>/containers/<concept-id>

Read first, in this order:
- AGENTS.md
- README.md
- docs/agent-workflows.md
- docs/container-spec.md
- docs/product/container-build-queue.yaml
- docs/product/sutd-product-slice-template.md
- .agents/skills/new-container/SKILL.md
- .agents/skills/new-sim-in-container/SKILL.md
- .agents/skills/review-container/SKILL.md
- Existing A-Level product slices only as shape references; do not edit `a-level/**`.

Use the local skills where applicable:
- `new-container` for the container skeleton
- `new-sim-in-container` for the simulation surface
- `review-container` before PR

Use report-only subagents before PR. If subagents are unavailable, record that
explicitly in the PR body:
- container auditor for container shape and required docs
- simulation architect for kernel boundaries and runtime contracts
- pedagogy reviewer for prediction, explanation, transfer, and accessibility

Build exactly one container. You may edit only:
- the target `sutd/content/**/containers/<concept-id>/` path
- same-branch SUTD package/shell files required to register the container
- generated graph/registry outputs
- docs generated for the target container

Do not edit A-Level files. Do not add or change `core/**` unless the prompt
explicitly asks for a core proposal. Use existing core packages for math,
simulation controls, graphs, state, prediction, and rendering.
Every interactive simulation must use `core/sim-runtime`; do not replace it
with a container-local mount contract.

Student UI requirements:
- prediction gate blocks reveal until commit when prediction is declared
- controls are labelled and accessible
- formulas include substituted values, signs, units, final result, and interpretation
- no internal code names, package names, or file paths appear in the learner UI
- include a transfer problem with rubric

Safety:
- cite sources
- do not copy textbook dumps
- do not copy GPL/AGPL/LGPL/proprietary/unclear code, sim logic, or media
- check any new dependency against LICENSES.json before using it

Validation before PR:
- pnpm container:validate
- pnpm container:docs <container-path>
- pnpm graph:generate
- pnpm graph:check
- pnpm -F @paideia/sutd-shell test
- pnpm test
- pnpm agent:validate

Open one PR titled:
feat(sutd): <concept title> product slice

PR body must include changed paths, validation results, sources used, licensing
statement, and any NEEDS-VERIFICATION items.
```

## SUTD First-Wave Targets

| Pillar | Queue id | First PR title |
| --- | --- | --- |
| Freshmore | `sutd.freshmore.vector-transformations` | `feat(sutd): vector transformations product slice` |
| EPD | `sutd.epd.pid-step-response` | `feat(sutd): PID step response product slice` |
| ESD | `sutd.esd.linear-programming-feasible-region` | `feat(sutd): linear programming feasible region product slice` |
| CSD/ISTD | `sutd.csd.graph-search-and-shortest-paths` | `feat(sutd): graph search and shortest paths product slice` |
| ASD | `sutd.asd.load-path-and-daylight-tradeoff` | `feat(sutd): load path and daylight tradeoff product slice` |
| DAI | `sutd.dai.trust-calibration` | `feat(sutd): trust calibration product slice` |
| SMT | `sutd.smt.ode-phase-portrait` | `feat(sutd): ODE phase portrait product slice` |
