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

- Container registry: turn the candidate registry below into checked structured data, then generate shell navigation, dependency graph views, and build queues from it.
- Notebook lab runtime: needed for computational topics, data analysis, and Python-first exploration.
- Media pipeline: thumbnails, diagrams, narrated walkthroughs, and fallback visuals should be generated and validated consistently.
- Assessment adapter: connect problem-solving algorithms, mastery state, FSRS/BKT, and curriculum-specific exam wrappers.
- Domain-specific heavy kernels: molecule, systems dynamics, argument graph, corpus, and comparator kernels should wait until a concrete first container needs them.

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

1. Physical quantities and units.
2. Scalars and vectors.
3. Resolving vectors.
4. Kinematics.
5. Forces and equilibrium.
6. Work, energy, power.
7. Momentum.
8. Waves.
9. Circuits.
10. Probability and statistics.

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

The long curriculum inventory should become a structured registry, not prose. The prose roadmap explains architecture and build order; the registry should hold every candidate container with consistent fields.

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
