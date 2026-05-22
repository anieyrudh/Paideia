# Paideia Implementation Brief

Last updated: 2026-05-22

This is the single-file handoff for Paideia: what the project is, what has
already been built, what a complete container must contain, and what the current
container inventory looks like.

When a separate reference repository is provided for the exact contents expected
inside each container, update the "Container Item Contract" section first. That
section is the implementation checklist agents should follow.

## 1. What Paideia Is

Paideia is open educational infrastructure for concept-mastery learning. The
project is built around one reusable unit: the **container**. A container is a
self-contained concept product that owns its explanation, concept map,
simulation, media, embed API, problem-solving logic, sources, and review record.

Curriculum shells such as A-Level and SUTD provide the learner-facing navigation:
search, subject/module navigation, mastery map, learner progress, and
cross-container recommendations. The shell should not hand-code learning
relationships. It consumes generated graph data from the containers.

The product goal is simple: a learner should be able to open a concept, make a
prediction, manipulate a model, observe visual feedback, understand the formula
or reasoning being used, and transfer the idea to a different situation. The UI
is allowed to be flexible; the learning contract is not.

## 2. What Has Been Completed

### Repository Foundation

- Monorepo scaffold with `pnpm`, TypeScript strict mode, package workspaces, and
  project references.
- CI-style gates for typecheck, lint, tests, dependency boundaries, license
  checks, container validation, graph freshness, and agent-document validation.
- Governance and contribution docs, including PR/issue templates, code of
  conduct, docs for GitHub setup, and ADR template.
- License boundary: MIT code, CC-BY content in the current repo files, and a
  runtime dependency allowlist. GPL/AGPL/LGPL runtime bundling is blocked by
  policy.
- Cross-branch boundary checks: A-Level code cannot import from SUTD code and
  SUTD code cannot import from A-Level code.
- Generated catalogue and graph pipeline for curriculum shells and the sim
  harness.
- GitHub Pages oriented app structure for client-side shells.

### Core Kernel Layer

The shared `core/` layer now provides the reusable primitives used by
containers and simulations:

- `shared`: universal types, branded units, and `KernelResult`.
- `content-schema`: Zod schemas for containers, simulations, concept maps, and
  related authored data.
- `prediction-gate`: predict-before-reveal persistence and React gate.
- `sim-runtime`: simulation stage/runtime state.
- `ui-sim`: shared simulation controls.
- `charting`: line charts, histograms, density plots, sankey-style data views.
- `plotting`: 2D mathematical plotting primitives.
- `function-eval`: safe expression-to-function evaluation.
- `numerical-math`: derivatives, integrals, slopes, approximations, regression.
- `linear-algebra`: vector/matrix operations used by transformation sims.
- `mechanics`: force and motion calculations.
- `circuits`: DC/AC circuit calculations.
- `control-systems`: transfer functions, PID, step response, Bode/margins.
- `dynamical-systems`: ODE and phase/stability helpers.
- `optimization`: linear programming and optimisation helpers.
- `probability-stats`: probability, distributions, statistics, inference.
- `graph-algorithms`: traversal and shortest-path logic.
- `graph-layout`: node-link positioning.
- `algorithm-trace`: stepwise traces for algorithms.
- `timeline`, `annotation`, `mind-map`, `fsrs`, `bkt`, `three-scene`,
  `uncertainty-propagation`, and `dimensional-analysis`.

### Product Shells

- A-Level shell with generated catalogue, subject/module navigation, search,
  local mastery state, and container routing.
- SUTD shell with generated catalogue, pillar/module navigation, search, and
  container routing.
- Sim harness with generated route registry for browser-level container tests.
- Global navigation back to all curricula has been added to curriculum shells.

### Product Containers

As of this brief, the current product inventory is:

- 21 A-Level containers.
- 11 shared-core containers.
- 21 SUTD containers.
- 53 total containers.

The SUTD status drift has been corrected: all current SUTD containers are marked
`reviewed` with `qa_status: passed` in the status-hygiene branch/PR.

## 3. What "Finished" Means Today

For current Phase B purposes, a container is considered finished enough for the
product surface when:

- It validates with `pnpm container:validate`.
- It appears in generated graph/catalogue data.
- Its sim route appears in the generated sim harness registry.
- It has the full container shape listed below.
- Its simulation has a prediction gate test.
- Its revealed simulation state includes a visible visual artifact, not only
  text metrics.
- Formula-driven sims show formula, substitution, units, result, and legend.
- It has a non-empty `TECHNICAL.md` Filter/review section at the required
  lifecycle threshold.
- Package tests, shell tests, and relevant Playwright tests pass.

This does not mean every container is pedagogically perfect. It means the
container is structurally complete, reviewable, testable, and integrated into
the product.

## 4. Container Item Contract

This section is the implementation checklist. When the reference repository is
provided, reconcile that repository against this list and update this section.

Canonical path:

```text
<branch>/content/<subject>/containers/<concept-id>/
```

### Required Top-Level Items

| Item | Required | Purpose |
| --- | --- | --- |
| `container.yaml` | Yes | Source of truth: identity, status, capabilities, paths, metadata |
| `concept-card.md` | Yes | First-principles explanation, definitions, examples, misconceptions |
| `concept-map/` | Yes | Concept graph, mindmap, Mermaid graph |
| `embed/` | Yes | Host-ready API contract |
| `media/` | Yes | Thumbnail and fallback visuals |
| `problem-solving/` | Yes | Algorithm, stepwise solver, transfer problem walkthroughs |
| `README.md` | Yes | Human-readable summary for the container |
| `TECHNICAL.md` | Yes | Implementation, tests, accessibility, Filter/review record |
| `sources.md` | Expected | Citations and source boundary record |
| `simulation/` | Required for sim-worthy concepts | Main interactive explorable |
| `notebook-lab/` | Optional | Python/data/computation lab |
| `visual-derivation/` | Optional | Interactive derivation for maths/physics |
| `extras/` | Optional | Supporting material that does not belong elsewhere |

The validator rejects unexpected top-level items.

### `container.yaml`

`container.yaml` records:

- stable `id`
- aliases
- branch
- subject
- level
- module
- title
- one-line summary
- syllabus reference
- prerequisites
- aid types
- prediction settings
- component paths
- capabilities
- simulation contract
- problem-solving contract
- embed API contract
- concept-map contract
- transfer problems
- assessments
- lifecycle status
- authoring owner/review/QA metadata
- Anieyrudh Filter/review gate
- misconceptions
- sources
- language

Lifecycle statuses:

```text
skeleton
content-only
draft
reviewed
ready-for-build
published
```

### `concept-card.md`

Should include:

- YAML frontmatter matching `container.yaml`
- first-principles explanation
- key definitions
- why the concept matters
- canonical examples
- common misconceptions
- links to prerequisites/downstream concepts where useful

### `concept-map/`

Required files:

```text
concept-map/
├── concept-map.yaml
├── mindmap.md
└── graph.mmd
```

Should include:

- prerequisites
- downstream links
- sibling concepts
- misconception graph
- human-friendly thematic overview
- Mermaid source that is text-based and Git-friendly

### `simulation/`

Required for sim-worthy concepts:

```text
simulation/
├── simulation.yaml
├── index.tsx
├── controls.yaml
├── presets.yaml
├── runtime.yaml
├── state-labels.yaml
└── simulation.test.ts
```

Required simulation behavior:

- Prediction gate blocks reveal before commit when prediction is declared.
- Learner controls directly manipulate meaningful state.
- Revealed state includes at least one visible visual artifact:
  - chart
  - plot
  - vector field
  - SVG diagram
  - canvas
  - 3D scene
  - equivalent interactive visualization
- Text-only observation states are not acceptable for sim-worthy concepts.
- Formula-driven sims show:
  - formula
  - substitution
  - units
  - result
  - color-coded legend
  - interpretation
- Tests should cover:
  - prediction gate blocks reveal
  - reveal state appears after commit
  - visual artifact exists after reveal
  - manipulation changes readouts/visual state
  - accessibility scan has no serious or critical issues when feasible

### `embed/`

Required files:

```text
embed/
├── api.ts
├── index.ts
└── embed.test.ts
```

Required API methods:

```text
load
saveState
score
resume
syncTheme
destroy
```

### `media/`

Required files:

```text
media/
├── thumbnail.svg
└── fallback.svg
```

Media should provide:

- a lightweight thumbnail for catalogue/search views
- a fallback static visual when the sim cannot run
- diagrams or generated visuals only when they clarify the concept
- no copied textbook dumps or proprietary assets

### `problem-solving/`

Required files:

```text
problem-solving/
├── algorithm.md
├── steps.yaml
└── <transfer-id>.md
```

Should include:

- decision procedure, solver, strategy tree, proof outline, or worked method
- steps that can be parsed and reviewed
- one markdown file per declared transfer problem
- explanation of how transfer preserves the same underlying concept

### `sources.md`

Expected for curriculum work. Should include:

- source citations
- URLs
- publication years
- license/source boundary notes
- syllabus alignment
- notes on what was used and what was not copied

### `README.md`

Should be concise and human-readable:

- what the container teaches
- what surfaces it includes
- how to run or test it
- current status
- source and review notes

### `TECHNICAL.md`

Should include:

- core kernels used
- simulation/spec notes
- accessibility record
- test record
- known limitations
- Anieyrudh Filter pass
- P0/P1 issue resolution
- iteration log

## 5. Current Container Inventory

### A-Level Containers

| Container | Subject | Module | Status | Summary |
| --- | --- | --- | --- | --- |
| Confidence Intervals | mathematics | Probability and Statistics | reviewed | Estimate a population mean with known sigma, compute the margin of error, and interpret confidence without treating the parameter as random. |
| Hypothesis Testing | mathematics | Probability and Statistics | reviewed | Formulate H0 and H1, standardise a sample mean, compare with a critical region, and interpret the p-value decision safely. |
| Normal Distribution | mathematics | Probability and Statistics | reviewed | Standardise a normal random variable, read interval or tail areas, and interpret probabilities in context. |
| Probability and Statistics | mathematics | Probability and Statistics | reviewed | Use probability distributions to compute expected value, variance, and a sample-mean hypothesis-test decision. |
| Alternating Current | physics | Electricity and Magnetism | reviewed | Connect sinusoidal supplies, rms values, impedance, phase, and power in AC circuits. |
| Capacitance | physics | Electricity and Magnetism | reviewed | Predict stored charge and energy in a capacitor, then interpret exponential discharge through the time constant. |
| Circuits | physics | Electricity and Magnetism | reviewed | Reduce series-parallel DC circuits, predict current changes, and connect voltage, current, resistance, and power. |
| Circular Motion | physics | Forces and Motion | reviewed | Relate constant speed on a circular path to inward acceleration and resultant force. |
| Electric Fields | physics | Electricity and Magnetism | reviewed | Predict field direction, calculate force on a charge, and connect electric potential to energy transfer. |
| Forces and Equilibrium | physics | Forces and Motion | reviewed | Balance perpendicular forces by making the resultant force zero in both horizontal and vertical directions. |
| Gravitational Fields | physics | Energy and Fields | reviewed | Use inverse-square reasoning to connect gravitational field strength, force, potential, and orbital speed. |
| Kinematics in One Dimension | physics | Foundations of Physics | reviewed | Connect displacement, velocity, acceleration, and time for motion along a straight line. |
| Magnetic Fields | physics | Electricity and Magnetism | reviewed | Use Fleming's left-hand rule and magnetic-force formulae to connect field direction, current, moving charges, and circular paths. |
| Momentum and Impulse | physics | Forces and Motion | reviewed | Connect momentum change to impulse and apply conservation of momentum in collisions. |
| Oscillations | physics | Oscillations | reviewed | Connect restoring acceleration, period, frequency, and energy exchange in simple harmonic motion. |
| Physical Quantities and Units | physics | Foundations of Physics | reviewed | Use a measurement-and-uncertainty lab to keep physical quantities, units, dimensions, and valid equations inseparable. |
| Resolving Vectors | physics | Foundations of Physics | reviewed | Break a vector into perpendicular components and use trigonometry to preserve both magnitude and direction. |
| Scalars and Vectors | physics | Foundations of Physics | reviewed | Distinguish scalar and vector quantities, then combine coplanar vectors without treating arrows as ordinary numbers. |
| Thermal Physics | physics | Thermal Physics | reviewed | Connect temperature, kelvin conversion, ideal-gas pressure, and thermal energy transfer. |
| Waves | physics | Waves | reviewed | Explore how two waves combine when their displacements meet at the same place and time. |
| Work, Energy, Power | physics | Forces and Motion | reviewed | Connect force along a displacement to energy transfer and the rate of transfer. |

### Shared-Core Containers

| Container | Subject | Module | Status | Summary |
| --- | --- | --- | --- | --- |
| Gradient Descent Landscape | cs | Optimisation / ML | reviewed | Trace how a learning rate turns a local gradient into a sequence of loss-reducing parameter updates. |
| Graph Algorithm Explorer | cs | Algorithms / networks | reviewed | Compare graph traversal, frontier growth, and weighted shortest-path evidence on the same network. |
| Bayes Theorem Visualiser | math | Probability | reviewed | Update a prior probability by comparing true-positive and false-positive routes after evidence. |
| Central Limit Theorem Sampler | math | Probability and Statistics | reviewed | Repeated sample means become more stable and more bell-shaped as sample size grows. |
| Eigenvector Transformations | math | Linear Algebra | reviewed | Test which vectors keep their direction under a 2x2 transformation and read the eigenvalue as the scale factor. |
| Hypothesis Test Decision Lab | math | Inference | reviewed | Decide whether sample evidence falls in a rejection region for a normal mean test. |
| LP Feasible Region Visualiser | math | Optimisation | reviewed | Build the feasible polygon from two-variable inequalities, then sweep a linear objective line to find the best corner. |
| ODE Phase Portrait Lab | math | Dynamical systems | reviewed | Classify a two-variable linear ODE by trace, determinant, and discriminant, then test how nearby trajectories move in the phase plane. |
| Circuit & Phasor Lab | physics | Signals and circuits | reviewed | Build a series RLC impedance vector, predict current phase, and connect reactance to waveform lead or lag. |
| Free-Body Diagram / Mechanics Lab | physics | Mechanics | reviewed | Balance perpendicular forces by making the resultant force zero in both horizontal and vertical directions. |
| PID Tuner and Bode Builder | systems | Control theory | reviewed | Tune PID gains and connect the closed-loop step response to open-loop Bode stability margins. |

### SUTD Containers

| Container | Subject | Module | Status | Summary |
| --- | --- | --- | --- | --- |
| Load Path and Daylight Tradeoff | asd | Architecture and Sustainable Design | reviewed | Tune one structural bay to see how bracing, window opening, and lateral load compete between a clear force path and useful daylight. |
| Shading, Daylight, and Heat Gain | asd | ASD environmental systems | reviewed | Tune facade shading to compare useful daylight against direct solar heat gain. |
| Structural Load Path Diagram | asd | ASD structural systems | reviewed | Trace lateral and gravity loads through a braced bay, calculate support reactions, and label member force demand. |
| Dynamic Programming State Recursion | csd | ISTD/CSD | reviewed | Define DP states, trace a recurrence, and read a memoisation table without changing the recurrence value. |
| Graph Search and Shortest Paths | csd | ISTD/CSD | reviewed | Compare BFS and DFS traversal traces, then contrast edge-count shortest paths with non-negative weighted Dijkstra costs. |
| Recursion Tree Complexity | csd | ISTD/CSD | reviewed | Estimate divide-and-conquer recurrence growth by comparing cost across recursion-tree levels. |
| Confusion Matrix Thresholds | dai | Design and Artificial Intelligence | reviewed | Tune a classifier threshold and explain how false positives, false negatives, precision, recall, and stakeholder cost move together. |
| Fairness Threshold Audit | dai | Design and Artificial Intelligence | reviewed | Compare group confusion matrices under a threshold policy and explain when a shared threshold creates unequal stakeholder harm. |
| Trust Calibration | dai | Data and AI | reviewed | Calibrate trust in a fixed classifier by comparing confidence, accuracy, costs, and a human-override rule. |
| Bode Stability Margin | epd | EPD Control Systems | reviewed | Read gain and phase margin from an open-loop Bode plot and connect margin size to closed-loop robustness. |
| PID Step Response | epd | EPD control systems | reviewed | Tune P, I, and D gains for a fixed second-order plant and compare overshoot, settling time, and steady-state error. |
| Signal Filter Frequency Response | epd | EPD Control Systems | reviewed | Tune a one-pole RC filter and read cutoff, magnitude, phase, and circuit phasor evidence from the same frequency-response model. |
| Linear Programming Feasible Region | esd | esd | reviewed | Explore feasibility and objective trade-offs in two-variable linear programming using constraint substitutions. |
| Markov Chain Steady State | esd | Stochastic Modelling and Engineering Systems | reviewed | Find the long-run state mix of a two-state stochastic system from its transition matrix. |
| Newsvendor Critical Fractile | esd | Stochastic Optimisation and Supply Chain Decisions | reviewed | Balance shortage and leftover costs to choose the demand fractile for a one-period stocking decision. |
| Bayes Updating | freshmore | Probability and Statistics | reviewed | Use prior probability, sensitivity, and specificity to update belief after positive evidence. |
| Eigenvector Transformations | freshmore | Linear Algebra and Differential Equations | reviewed | Test which vectors keep their direction under a 2x2 transformation and read the eigenvalue as the scale factor. |
| Vector Transformations | freshmore | Linear Algebra and Differential Equations | reviewed | Explore how 2x2 matrices move basis vectors and any target vector, then check when one direction stays on the same line. |
| Fourier Mode Superposition | smt | Science, Mathematics and Technology | reviewed | Build a target shape from sine basis modes, interpret each coefficient, and compare reconstruction error as modes are added. |
| Linear System Stability | smt | Science, Mathematics and Technology | reviewed | Predict whether a two-state linear system settles, rotates, splits, or grows by reading the trace, determinant, discriminant, and eigenvalues. |
| ODE Phase Portrait | smt | Science, Mathematics and Technology | reviewed | Classify a two-variable linear ODE by trace, determinant, and discriminant, then test how nearby trajectories move in the phase plane. |

## 6. Current Implementation Rules For Agents

When implementing a new container:

1. Pick exactly one queue item.
2. Claim it by changing queue status from `ready-for-build` to `in-build`.
3. Build exactly one container per PR.
4. Use existing `core/` kernels for math/physics/CS logic.
5. Do not inline reusable domain math into a container if a kernel should own it.
6. Keep branch imports separate: A-Level cannot import SUTD and SUTD cannot
   import A-Level.
7. Run `pnpm graph:generate` after adding or changing a container.
8. Run the focused container checks first, then repo gates.
9. If generated files conflict, rebase, regenerate, and rerun validation.
10. Mark the queue item `reviewed` only after PR review and validation pass.

Minimum validation commands:

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
pnpm roadmap:validate
pnpm agent:validate
```

For sim-worthy containers, also run or add Playwright tests that verify:

- prediction gate blocks reveal
- reveal appears after commit
- reveal includes a visual artifact
- formula/substitution/units/legend are present when calculations are shown
- accessibility has no serious or critical issues after reveal

## 7. What Is Pending

The current repo has a working product foundation and a meaningful first set of
reviewed containers. The next work should focus on:

- merging the status-hygiene PR if not already merged
- merging the visible PID reveal PR if not already merged
- reconciling this brief against the external reference repository once supplied
- adding any missing required container items from that reference repository
- auditing existing containers against the visual simulation standard
- improving the public README and onboarding docs for non-technical contributors
- expanding container coverage by queue discipline, one container per PR

## 8. How To Use This File

Use this file as the first read for implementation sessions. After reading it,
an agent should inspect the specific target container, its `container.yaml`,
`simulation/simulation.yaml`, nearest reviewed examples, and the relevant
`core/<kernel>/AGENTS.md` contracts.

Do not treat this file as a replacement for validators. It is a human and agent
handoff document; the source of truth remains the schemas, validators, and
container files in the repository.
