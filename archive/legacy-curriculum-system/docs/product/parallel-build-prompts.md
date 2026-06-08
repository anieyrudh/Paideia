# Parallel Build Prompts

Use one Codex or Claude instance per row. Each instance owns one PR. Do not ask
one instance to build multiple containers. Respect prerequisite order; parallel
means "independent targets with separate PRs", not "ignore the concept graph".

## Operating Rule

Large-scale parallel work is safe when the branch target, queue id, and edited
paths are disjoint. If two instances need the same package or generated file,
let both PRs land separately and resolve generated-file conflicts during merge.
After every rebase or conflict resolution, rerun graph generation and check
generated outputs before review.

Shared-core rule: a queue id beginning with `shared.` must be built at
`shared/content/<discipline>/containers/<concept-id>/` and registered through a
shared package such as `@paideia/shared-sims`. Do not move a shared-core concept
into `a-level/` or `sutd/`; those curricula can add wrappers in later PRs.

## SUTD Parallel Wave

Use the prompt in `docs/product/sutd-product-slice-template.md`, replacing the
target block with one of these.

### SUTD Freshmore

```text
Target:
- Pillar: Freshmore
- Queue id: sutd.freshmore.vector-transformations
- Title: Vector Transformations
- Expected container path: sutd/content/freshmore/containers/vector-transformations
- Branch: codex/sutd-freshmore-vector-transformations
- Scope constraints: 2D matrix-vector transforms, basis-vector movement, and a
  limited invariant-direction check only. Do not build the full
  eigenvalue/eigenvector lesson. If the container schema needs an interaction
  type, use an existing allowed value; do not edit schema enums.
```

### SUTD EPD

```text
Target:
- Pillar: EPD
- Queue id: sutd.epd.pid-step-response
- Title: PID Step Response
- Expected container path: sutd/content/epd/containers/pid-step-response
- Branch: codex/sutd-epd-pid-step-response
- Scope constraints: step response only, using a fixed simple plant plus
  presets. Do not add Bode plots, root locus, state-space control, autotuning,
  noise modelling, or new `core/control-systems` APIs.
```

### SUTD ESD

```text
Target:
- Pillar: ESD
- Queue id: sutd.esd.linear-programming-feasible-region
- Title: Linear Programming Feasible Region
- Expected container path: sutd/content/esd/containers/linear-programming-feasible-region
- Branch: codex/sutd-esd-linear-programming-feasible-region
- Scope constraints: two-variable linear programming only. Do not build the
  shared-core LP wrapper in this PR. Do not add simplex, high-dimensional
  optimisation, stochastic modelling, or new `core/optimization` APIs.
```

### SUTD CSD/ISTD

```text
Target:
- Pillar: CSD/ISTD
- Queue id: sutd.csd.graph-search-and-shortest-paths
- Title: Graph Search and Shortest Paths
- Expected container path: sutd/content/csd/containers/graph-search-and-shortest-paths
- Branch: codex/sutd-istd-csd-graph-search-and-shortest-paths
- Scope constraints: BFS/DFS traversal trace plus a small non-negative weighted
  Dijkstra result comparison. Graph presets should stay around 6-8 nodes. Do
  not add A*, Bellman-Ford, negative weights, network flow, Dijkstra step
  tracing, or new `core/graph-*` / `core/algorithm-trace` APIs.
```

### SUTD ASD

```text
Target:
- Pillar: ASD
- Queue id: sutd.asd.load-path-and-daylight-tradeoff
- Title: Load Path and Daylight Tradeoff
- Expected container path: sutd/content/asd/containers/load-path-and-daylight-tradeoff
- Branch: codex/sutd-asd-load-path-and-daylight-tradeoff
- Scope constraints: bounded 2D single-bay toy model only. Use a simple load
  vector, bracing choice, and aperture ratio as a daylight proxy. Do not add a
  structural solver, sun-path modelling, Radiance/daylight simulation, thermal
  analysis, or new `core/**` APIs.
```

### SUTD DAI

```text
Target:
- Pillar: DAI
- Queue id: sutd.dai.trust-calibration
- Title: Trust Calibration
- Expected container path: sutd/content/dai/containers/trust-calibration
- Branch: codex/sutd-dai-trust-calibration
- Scope constraints: fixed calibration dataset only. Compare confidence,
  accuracy, false-positive/false-negative costs, and a human override rule. Do
  not train models, call AI APIs, build an ethics dashboard, or add new
  evaluation kernels.
```

### SUTD SMT

```text
Target:
- Pillar: SMT
- Queue id: sutd.smt.ode-phase-portrait
- Title: ODE Phase Portrait
- Expected container path: sutd/content/smt/containers/ode-phase-portrait
- Branch: codex/sutd-smt-ode-phase-portrait
- Scope constraints: 2D autonomous ODE phase portrait with a few presets,
  equilibrium classification, and parameter-change comparison. Limit the sim to
  3-4 presets, one or two scalar parameters per preset, and a bounded number of
  visible trajectories. Do not add PDEs, stiff solvers, symbolic algebra, chaos
  tooling, an integrator chooser, bifurcation/nullcline tooling, or new
  `core/dynamical-systems` APIs.
```

## A-Level Parallel Wave

Use this prompt template, replacing the target block with one row below.

```text
You are building one A-Level Paideia product slice.

Repo: Paideia/paideia
Base branch: main
Create branch: codex/a-level-<subject>-<concept-id>

Target:
- Curriculum: A-Level
- Subject: <subject>
- Queue id: <id from docs/product/container-build-queue.yaml>
- Title: <title from queue>
- Expected container path: a-level/content/<subject>/containers/<concept-id>

Read first, in this order:
- AGENTS.md
- README.md
- docs/agent-workflows.md
- docs/container-spec.md
- docs/product/container-build-queue.yaml
- .agents/skills/new-container/SKILL.md
- .agents/skills/new-sim-in-container/SKILL.md
- .agents/skills/review-container/SKILL.md
- docs/product/simulation-presentation-standard.md
- Existing reviewed A-Level product slices:
  - a-level/content/physics/containers/physical-quantities-and-units
  - a-level/content/physics/containers/scalars-and-vectors
  - a-level/content/physics/containers/resolving-vectors
  - a-level/content/physics/containers/kinematics-in-one-dimension

Use the local skills where applicable:
- `new-container` for the container skeleton
- `new-sim-in-container` for the simulation surface
- `review-container` before PR
- `game-studio:web-game-foundations` before implementation when engine/input/state/asset boundaries are not obvious
- `game-studio:game-playtest` for browser/screenshot QA of the simulation
- `game-studio:phaser-2d-game` only when the sim is a game-like 2D canvas scene
- `game-studio:sprite-pipeline` only for 2D sprite generation or normalization
- `game-studio:game-ui-frontend` for canvas/WebGL HUDs, overlays, menus, and playfield protection
- `game-studio:react-three-fiber-game` only when the sim is genuinely 3D and React-hosted
- `game-studio:web-3d-asset-pipeline` only for GLB/glTF asset preparation
- `build-web-apps:shadcn` only when the app has `components.json` or the task explicitly initializes shadcn

Use report-only subagents before PR. If subagents are unavailable, record that
explicitly in the PR body:
- container auditor for container shape and required docs
- simulation architect for kernel boundaries and runtime contracts
- pedagogy reviewer for prediction, explanation, transfer, and accessibility

Build exactly one container. You may edit only:
- the target `a-level/content/**/containers/<concept-id>/` path
- same-branch A-Level package/shell files required to register the container
- generated graph/registry outputs
- docs generated for the target container
- for `forces-and-equilibrium` only, existing A-Level physics concept maps may
  be updated to resolve the current `forces-and-newtons-laws` taxonomy link
  into the new canonical target id

Do not edit `sutd/**`. Do not add or change `core/**` unless the prompt
explicitly asks for a core proposal. Use existing core packages for reusable
math, physics, plotting, graph layout, controls, and prediction.
Every interactive simulation must use `core/sim-runtime`; do not replace it
with a container-local mount contract.

Student UI requirements:
- every product slice declares a prediction path, and a test proves the
  prediction checkpoint saves reflection without blocking the simulation
- controls are labelled and accessible
- formulas are LaTeX code blocks with nearby color-coded symbol legends
- formulas include substituted values, signs where relevant, units inside terms,
  final result, and interpretation
- formula colors match controls, traces, vectors, and readouts, with labels so
  meaning does not rely on color alone
- no internal code names, package names, or file paths appear in learner UI
- include a transfer problem with rubric
- include a route-level Playwright or equivalent browser check for the revealed
  simulation state, including accessibility after formula/reveal UI appears

Safety:
- cite sources
- do not copy textbook dumps
- do not copy GPL/AGPL/LGPL/proprietary/unclear code, sim logic, or media
- check any new dependency against LICENSES.json before using it

Validation before PR:
- pnpm install
- pnpm container:validate
- pnpm container:docs <container-path>
- pnpm graph:generate
- pnpm graph:check
- pnpm -F @paideia/a-level-shell test
- pnpm test
- pnpm agent:validate

Open one PR titled:
feat(a-level): <concept title> product slice

PR body must include changed paths, validation results, sources used, licensing
statement, and any NEEDS-VERIFICATION items.
```

| Wave | Subject | Queue id | Title | Expected container path | Parallel note |
| --- | --- | --- | --- | --- | --- |
| 1 | Physics | `alevel.physics.forces-and-equilibrium` | Forces and equilibrium | `a-level/content/physics/containers/forces-and-equilibrium` | Build first. Also resolve the existing `forces-and-newtons-laws` concept-map links. |
| 2 | Physics | `alevel.physics.work-energy-power` | Work, energy, power | `a-level/content/physics/containers/work-energy-power` | Start after forces lands. Can run beside momentum if both rebase/regenerate before review. |
| 2 | Physics | `alevel.physics.momentum` | Momentum | `a-level/content/physics/containers/momentum` | Start after forces lands. Can run beside work-energy if both rebase/regenerate before review. |
| 3 | Physics | `alevel.physics.waves` | Waves | `a-level/content/physics/containers/waves` | Larger visual slice; run after mechanics wave or in a separate instance. |
| 3 | Physics | `alevel.physics.circuits` | Circuits | `a-level/content/physics/containers/circuits` | Larger domain slice; run after mechanics wave or in a separate instance. |
| 3 | Mathematics | `alevel.math.probability-statistics` | Probability and statistics | `a-level/content/mathematics/containers/probability-statistics` | Independent of physics; can run in parallel with Wave 2 if shell/generated conflicts are rebased carefully. |
