# Paideia Container Roadmap

This document is the curriculum-wide build map for Paideia containers across SUTD, Singapore A-Levels, IB, and cross-curriculum shared concepts.

The goal is not to duplicate content per curriculum. Paideia should build reusable theory containers first, then wrap them for curriculum-specific syllabus, assessment, and learner-path requirements.

## Core Principle

Build by **concept cluster**, not by administrative course.

A concept container should be reusable whenever the underlying idea is shared. For example:

- Bayes theorem can serve SUTD probability, A-Level probability, IB Math AI, psychology research methods, and AI/ML.
- Eigenvectors can serve SUTD linear algebra, control, PCA, vibrations, graphics, and data science.
- Graph algorithms can serve SUTD ISTD, ESD networks, A-Level Computing, IB Math AI, and IB Computer Science.

Curriculum folders should mostly provide wrappers, mappings, assessments, local sequencing, and local examples.

## Container Contract

Every complete container should declare:

- Stable concept ID.
- Curriculum mappings.
- Subject/module mapping.
- Concept card.
- Concept map.
- Simulation, when the concept is sim-worthy.
- Problem-solving algorithm.
- Media and fallback visuals.
- Embed API.
- Authoring metadata.
- Prerequisites and downstream concepts.

## Master Taxonomy

Every container should be tagged on these axes:

| Axis | Examples |
| --- | --- |
| Curriculum | `shared`, `sutd`, `alevel`, `ib` |
| Discipline | `math`, `physics`, `chemistry`, `biology`, `cs`, `econ`, `history`, `psych`, `design`, `architecture`, `systems` |
| Function | `simulation`, `visualizer`, `concept-map`, `mindmap`, `assessment`, `notebook-lab`, `argument-builder`, `tutor` |
| Level | `freshmore`, `undergrad-core`, `undergrad-advanced`, `a-level-h1`, `a-level-h2`, `ib-sl`, `ib-hl`, `postgrad` |
| Reuse status | `shared-core`, `curriculum-wrapper`, `subject-specific`, `assessment-only` |
| Priority | `P0`, `P1`, `P2` |

## Naming Convention

Use stable, namespaced concept IDs:

```text
shared.probability.bayes-updating
shared.linear-algebra.eigenvectors
sutd.epd.control.pid-step-response
alevel.physics.waves.interference
ib.tok.personal-vs-shared-knowledge
```

Implementation package names can stay runtime-focused:

```text
sim-bayes
sim-eigenlab
sim-pid-bode
alevel-sim-waves
ib-core-tok-essay
```

## Kernel Foundation Status

As of the kernel-wave integration branch, the repository has the foundation needed to start building real reusable containers rather than one-off demos.

Completed platform kernels:

- `core/prediction-gate`
- `core/sim-runtime`
- `core/ui-sim`
- `core/three-scene`

Completed P0 domain kernels:

- `core/probability-stats`
- `core/linear-algebra`
- `core/dynamical-systems`
- `core/optimization`
- `core/mechanics`
- `core/circuits`
- `core/control-systems`
- `core/graph-algorithms`

Existing Tier 1 support kernels already available for first product work:

- `core/function-eval`
- `core/numerical-math`
- `core/plotting`
- `core/charting`
- `core/graph-layout`
- `core/timeline`
- `core/annotation`
- `core/mind-map`
- `core/fsrs`
- `core/bkt`
- `core/algorithm-trace`

Next missing foundations:

- Container registry: keep the checked seed in [`container-build-queue.yaml`](./container-build-queue.yaml), then generate shell navigation, dependency graph views, and build queues from it.
- Container wave runbook: use [`container-wave-runbook.md`](./container-wave-runbook.md) to claim `ready-for-build` items safely and keep one container per PR.
- Parallel product-slice prompts: use [`parallel-build-prompts.md`](./parallel-build-prompts.md) for one-PR-per-container assignment.
- SUTD product-slice template: use [`sutd-product-slice-template.md`](./sutd-product-slice-template.md) before broad SUTD pillar work.
- Simulation presentation: use [`simulation-presentation-standard.md`](./simulation-presentation-standard.md) for LaTeX formula blocks, color-coded legends, renderer choice, and playtest expectations.
- Notebook lab runtime: needed for computational topics, data analysis, and Python-first exploration.
- Media pipeline: thumbnails, diagrams, narrated walkthroughs, and fallback visuals should be generated and validated consistently.
- Assessment adapter: connect problem-solving algorithms, mastery state, FSRS/BKT, and curriculum-specific exam wrappers.
- Domain-specific heavy kernels: molecule, systems dynamics, argument graph, corpus, and comparator kernels should wait until a concrete first container needs them.

## Product Slice Proofs

### A-Level Physics: Foundations Through Equilibrium

Status: landed on `main` as the first mechanics learning chain:
physical quantities and units → scalars and vectors → resolving vectors →
kinematics in one dimension → forces and equilibrium.

What it proved:

- A v2 container can drive the generated A-Level shell without hand-written
  catalogue metadata.
- `core/prediction-gate` blocks reveal in the learner route and remains
  testable through package and shell tests.
- Content markdown, `container.yaml`, `simulation.yaml`, concept-map files,
  problem-solving artifacts, media, embed API, and generated graph data can stay
  in one auditable container shape.
- Learner UI must map authoring tokens to student-facing labels; internal
  kernel names, package names, and file paths do not belong in the student
  surface.
- Formula substitution is part of the simulation contract, not optional copy.
  Follow the simulation presentation standard: LaTeX formula block, nearby
  color-coded legend, substituted values, units, and interpretation.
- Route-level Playwright and axe checks are required after reveal, because
  pre-reveal tests do not prove the actual sim is usable.
- Follow-on slices can reuse the same package, shell route, sim-harness, and
  generated graph path without reworking the platform.

Latest slice notes:

- Queue hygiene checked on May 21, 2026 after the route-fix and GitHub workflow
  cleanup PRs: landed slices remain `reviewed`; no entries are stuck in
  `in-build`; no entries are currently promoted to `ready-for-build`.
- `kinematics-in-one-dimension` is reviewed and merged.
- `forces-and-equilibrium` is reviewed and merged; it is the first force-balance
  slice consuming both vector resolution and kinematics.
- Deep review on recent slices found and fixed missing substitution units,
  package-local project-reference typecheck drift, downstream taxonomy mismatch,
  and student-facing copy that exposed implementation details.
- `work-energy-power`, `momentum`, `waves`, `circuits`, A-Level
  `probability-statistics`, `circular-motion`, `oscillations`,
  `thermal-physics`, `gravitational-fields`, `electric-fields`,
  `hypothesis-testing`, `capacitance`, `alternating-current`,
  `magnetic-fields`, `normal-distribution`, and `confidence-intervals` are now
  reviewed. The next A-Level work should be promoted in the queue before
  agents start another wave.

Next ready-for-build A-Level wave:

No A-Level entries are currently promoted after the May 21, 2026 container
wave. Promote the next candidates in `container-build-queue.yaml` before
launching more agents.

### SUTD First Pillar Slices

Status: twenty-one SUTD product slices have landed on `main` and are
tracked in the build queue with required kernels:

| Pillar | Container | Status | Required kernels |
| --- | --- | --- | --- |
| Freshmore | `sutd.freshmore.vector-transformations` | reviewed | `core/sim-runtime`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| EPD | `sutd.epd.pid-step-response` | reviewed | `core/sim-runtime`, `core/control-systems`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| ESD | `sutd.esd.linear-programming-feasible-region` | reviewed | `core/sim-runtime`, `core/optimization`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| CSD | `sutd.csd.graph-search-and-shortest-paths` | reviewed | `core/sim-runtime`, `core/graph-algorithms`, `core/graph-layout`, `core/algorithm-trace`, `core/prediction-gate`, `core/ui-sim` |
| ASD | `sutd.asd.load-path-and-daylight-tradeoff` | reviewed | `core/sim-runtime`, `core/linear-algebra`, `core/mechanics`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| DAI | `sutd.dai.trust-calibration` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/annotation`, `core/prediction-gate`, `core/ui-sim` |
| SMT | `sutd.smt.ode-phase-portrait` | reviewed | `core/sim-runtime`, `core/dynamical-systems`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| Freshmore | `sutd.freshmore.bayes-updating` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Freshmore | `sutd.freshmore.eigenvector-transformations` | reviewed | `core/sim-runtime`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| EPD | `sutd.epd.bode-stability-margin` | reviewed | `core/sim-runtime`, `core/control-systems`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| ESD | `sutd.esd.newsvendor-critical-fractile` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/optimization`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| CSD | `sutd.csd.dynamic-programming-state-recursion` | reviewed | `core/sim-runtime`, `core/graph-layout`, `core/prediction-gate`, `core/ui-sim` |
| ASD | `sutd.asd.shading-daylight-heat-gain` | reviewed | `core/sim-runtime`, `core/linear-algebra`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| DAI | `sutd.dai.confusion-matrix-thresholds` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/annotation`, `core/prediction-gate`, `core/ui-sim` |
| SMT | `sutd.smt.linear-system-stability` | reviewed | `core/sim-runtime`, `core/dynamical-systems`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| ESD | `sutd.esd.markov-chain-steady-state` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/linear-algebra`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| CSD | `sutd.csd.recursion-tree-complexity` | reviewed | `core/sim-runtime`, `core/algorithm-trace`, `core/graph-layout`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| EPD | `sutd.epd.signal-filter-frequency-response` | reviewed | `core/sim-runtime`, `core/control-systems`, `core/circuits`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| ASD | `sutd.asd.structural-load-path-diagram` | reviewed | `core/sim-runtime`, `core/mechanics`, `core/linear-algebra`, `core/graph-layout`, `core/prediction-gate`, `core/ui-sim` |
| DAI | `sutd.dai.fairness-threshold-audit` | reviewed | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/annotation`, `core/prediction-gate`, `core/ui-sim` |
| SMT | `sutd.smt.fourier-mode-superposition` | reviewed | `core/sim-runtime`, `core/numerical-math`, `core/charting`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |

Next SUTD candidates in order:

No SUTD entries are currently promoted after the May 21, 2026 container wave.
Promote the next pillar candidates in `container-build-queue.yaml` before
launching more agents.

### Build Queue Discipline

The machine-readable source is
[`container-build-queue.yaml`](./container-build-queue.yaml). Every candidate
must keep its `kernel_dependencies` list current before an agent starts work.
That list is the guardrail against local, one-off math inside a container.

Use this status vocabulary:

| Status | Meaning |
| --- | --- |
| `planned` | Candidate exists but no PR is active. |
| `ready-for-build` | Sources, kernels, and target path are clear enough for assignment. |
| `in-build` | A branch or PR is actively building the slice. |
| `reviewed` | Product slice has landed with container validation and route/sim tests. |
| `blocked` | Needs a kernel, source decision, clean-room replacement, or design decision. |

### Repeatable Container Build Loop

Use this loop for every product-quality container:

1. Start from `main`, read `docs/container-spec.md`, the existing product slice,
   and the target container files.
2. Keep the v2 container layout intact: `container.yaml`, `concept-card.md`,
   `concept-map/`, `simulation/`, `problem-solving/`, `media/`, `embed/`,
   `sources.md`, `README.md`, and `TECHNICAL.md`.
3. Put reusable math, physics, rendering, state, or learning logic in `core/`;
   the container only composes kernels into a student-facing experience.
4. Gate observation with `PredictionGate` whenever prediction metadata exists.
5. Make calculations visible with the formula, substituted values, units, and
   the conceptual reason the formula applies.
6. Regenerate graph data, run package tests, run shell tests, run container
   validation, and record failures in `TECHNICAL.md`.
7. Mark the container `reviewed` only after P0/P1 issues are resolved or
   explicitly deferred with a tracked reason.

## Priority Tiers

### P0: Universal Theory Infrastructure

Build these first because they unlock the most reuse.

| Container | Cluster | Curricula |
| --- | --- | --- |
| Bayes Theorem Visualiser | Bayesian reasoning | SUTD, A-Level, IB |
| Central Limit Theorem Sampler | Probability | SUTD, A-Level, IB |
| Hypothesis Test Decision Lab | Inference | SUTD, A-Level, IB |
| Eigenvector Transformation Lab | Linear algebra | SUTD, IB, shared math |
| ODE Phase Portrait Lab | Dynamical systems | SUTD, IB, engineering |
| Gradient Descent Landscape | Optimisation / ML | SUTD, IB, A-Level Computing |
| Graph Algorithm Explorer | Algorithms / networks | SUTD, A-Level Computing, IB |
| Free-Body Diagram / Mechanics Lab | Physics / engineering | SUTD, A-Level, IB |
| Circuit & Phasor Lab | Signals / circuits | SUTD, A-Level, IB |
| PID Tuner & Bode Builder | Control theory | SUTD, engineering |
| LP Feasible Region Visualiser | Optimisation | SUTD ESD, IB Math AI |
| TOK Knowledge Framework Explorer | IB core | IB |

### P1: High-Value Simulation Families

| Family | Examples |
| --- | --- |
| Vector calculus | Gradient fields, Stokes, divergence, conservative fields |
| Thermodynamics | Entropy, Carnot, Rankine, Brayton |
| Algorithms | Recursion trees, sorting, dynamic programming, graph traversal |
| Electrical systems | Maxwell builder, impedance, power electronics |
| Chemistry | Equilibrium, kinetics, spectroscopy, VSEPR |
| Biology | DNA-to-protein, membranes, enzyme kinetics |
| IB IA / EE | Research question generator, source pack builder, uncertainty lab |
| ESD systems | Markov chains, queueing, newsvendor, bullwhip |

### P2: Specialized, Advanced, And Humanities

| Area | Examples |
| --- | --- |
| ASD | Load paths, daylighting, architectural comparators |
| DAI | Human-centred AI, trust calibration, AI evaluation |
| SMT | Acoustics, spiking neurons, quantum confinement |
| IB Arts | Comparative study builder, process portfolio logger |
| History / GP / TOK | OPVL, argument maps, historiography lens tools |

## Curriculum Views

### SUTD

Organize SUTD by shared theory clusters:

- Freshmore core.
- ISTD / CSD.
- EPD.
- ESD.
- ASD.
- DAI.
- SMT.
- Graduate overlays.

Highest-priority clusters:

- Calculus.
- Linear algebra.
- Vector calculus.
- Differential equations.
- Mechanics.
- Electromagnetism.
- Probability and statistics.
- Algorithms.
- Optimisation.
- Control.
- Signals and circuits.
- AI/ML.

### Singapore A-Levels

Organize by syllabus subject, but reuse shared containers wherever possible.

Initial focus:

- A-Level Physics.
- A-Level Mathematics.
- A-Level Chemistry.
- A-Level Biology.
- A-Level Computing.
- Economics and GP later as structured reasoning containers.

First useful A-Level sequence:

1. Physical quantities and units. Status: reviewed product slice.
2. Scalars and vectors. Status: first product-quality slice landed.
3. Resolving vectors. Status: reviewed product slice.
4. Kinematics in one dimension. Status: reviewed product slice.
5. Forces and equilibrium. Status: reviewed product slice.
6. Work, energy, power. Status: reviewed product slice.
7. Momentum. Status: reviewed product slice.
8. Waves. Status: reviewed product slice.
9. Circuits. Status: reviewed product slice.
10. Probability and statistics. Status: reviewed product slice.
11. Circular motion. Status: reviewed product slice.
12. Oscillations. Status: reviewed product slice.
13. Thermal physics. Status: reviewed product slice.
14. Gravitational fields. Status: reviewed product slice.
15. Electric fields. Status: reviewed product slice.
16. Hypothesis testing. Status: reviewed product slice.
17. Capacitance. Status: reviewed product slice.
18. Alternating current. Status: reviewed product slice.
19. Magnetic fields. Status: reviewed product slice.
20. Normal distribution. Status: reviewed product slice.
21. Confidence intervals. Status: reviewed product slice.

### IB

IB needs both content mastery and programme-core support.

Build order:

1. TOK containers.
2. EE containers.
3. IA infrastructure.
4. Group 4 science containers.
5. Group 5 math containers.
6. Economics / History / Psychology.
7. Language and Arts process containers.

IB-specific overlays should include:

- HL/SL distinction.
- IA links.
- TOK links.
- EE suitability.
- Assessment criteria.
- Reflection prompts.

## Cross-Curriculum Shared Containers

### Mathematics Shared

- Derivative intuition.
- Integral accumulation.
- ODE phase portrait.
- Eigenvectors and eigenvalues.
- Fourier / spectral reasoning.
- Probability distributions.
- Bayes theorem.
- CLT and inference.

### Physics / Engineering Shared

- Free-body diagrams.
- Entropy and Carnot efficiency.
- Circuit and phasor reasoning.
- Maxwell field reasoning.
- Quantum tunnelling and confinement.
- Control and PID.
- Signal processing and DFT.

### Computing / AI Shared

- Complexity growth.
- Graph algorithms.
- Dynamic programming memoisation.
- Gradient descent loss surfaces.
- Backpropagation.
- Attention heatmaps.
- RSA / cryptography.
- TCP congestion.
- Consensus: Paxos and Raft.

### Inquiry And Research Shared

- Research question evaluator.
- Source pack builder.
- Argument map builder.
- Concept map and mindmap generator.
- Reflection / Feynman explain-back.
- IA / EE / TOK transfer prompt engine.

## First Repository Workstreams

Use these as the first planning groups:

```text
shared-math
shared-probability-stats
shared-physics-core
shared-algorithms-ai
sutd-freshmore
sutd-istd
sutd-epd
sutd-esd
alevel-math
alevel-physics
alevel-chemistry
alevel-biology
ib-core-tok-ee-cas
ib-sciences
ib-math-aa
ib-math-ai
ib-economics-history-psychology
ib-language-arts
```

## Candidate Registry Seed

The long curriculum inventory should live as structured registry data, not only prose. The prose roadmap explains architecture and build order; [`container-build-queue.yaml`](./container-build-queue.yaml) holds the initial machine-readable build queue and is validated with:

```bash
pnpm roadmap:validate
```

Keep this table as the human-readable field contract. Add or reorder candidates in the YAML queue so future tooling can assign work by concept cluster, curriculum mapping, priority, kernel dependencies, and status.

Recommended registry fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable namespaced concept/container ID |
| `title` | Human-readable name |
| `priority` | `P0`, `P1`, or `P2` |
| `cluster` | Shared concept cluster |
| `curricula` | Curricula served |
| `module_mappings` | SUTD module, A-Level syllabus, IB group/course links |
| `simulation_type` | Main interactive form |
| `problem_solving_elements` | Required strategy/procedure support |
| `concept_map_needs` | Prerequisites, downstream concepts, misconception graph |
| `repo_package_name` | Implementation package name |
| `dependencies` | Core kernels or runtime libraries |
| `estimated_effort` | `S`, `M`, or `H` |

## Implementation Notes

Preferred reusable implementation families:

| Need | Candidate |
| --- | --- |
| Simulation packaging | PhET-style architecture |
| Math visualisation | JSXGraph |
| Problem widgets | Perseus-style renderer |
| Graph/network visualisation | D3 / graph-layout core |
| 3D scenes | Three.js |
| Notebook labs | Pyodide, later |
| Concept maps | Mermaid first, graph runtime later |

## Rule For New Containers

Before creating a new container, decide whether the concept is:

1. A shared-core concept.
2. A curriculum wrapper around shared-core.
3. A subject-specific concept.
4. Assessment-only or process-only.

Only create new simulation logic if the existing shared kernel or container cannot serve the learning objective.
