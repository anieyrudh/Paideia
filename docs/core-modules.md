# Core Module Inventory

Core packages are shared contracts. Branch code consumes them; branch code does
not copy their logic or fork behavior for one institution.

## Tier 1: Independent Kernels

| Module | Purpose | When to consider | Contract |
| --- | --- | --- | --- |
| `prediction-gate` | Predict-before-reveal gate for PMOE-T sims. | "Use `core/prediction-gate` whenever a simulation has a Predict stage in its PMOE-T arc." | [`AGENTS.md`](../core/prediction-gate/AGENTS.md) |
| `content-schema` | Zod schemas for packages, sims, assessments, rubrics, and course maps. | "Use `core/content-schema` any time you author, validate, persist, or load a concept package, simulation, assessment, rubric, or course map." | [`AGENTS.md`](../core/content-schema/AGENTS.md) |
| `shared` | Universal types, branded units, and `KernelResult`. | "Use `core/shared` any time you write a function signature, declare a domain, return a kernel result, or accept a value whose unit matters." | [`AGENTS.md`](../core/shared/AGENTS.md) |
| `function-eval` | Parse learner or author math expressions into callable functions. | "Use `core/function-eval` whenever a learner or author supplies a math expression as a string and the system needs to call it as a function." | [`AGENTS.md`](../core/function-eval/AGENTS.md) |
| `plotting` | 2D mathematical function, curve, vector-field, and overlay rendering. | "Use `core/plotting` whenever the visual is a 2D mathematical object." | [`AGENTS.md`](../core/plotting/AGENTS.md) |
| `numerical-math` | Numerical derivatives, integrals, slopes, sums, approximations, and regressions. | "Use `core/numerical-math` when your sim needs to compute derivatives, integrals, secant/tangent slopes, Riemann sums, Taylor approximations, or simple regressions of a user-supplied function." | [`AGENTS.md`](../core/numerical-math/AGENTS.md) |
| `charting` | Quantitative charts over sampled data and rows. | "Use `core/charting` for any quantitative chart over data." | [`AGENTS.md`](../core/charting/AGENTS.md) |
| `graph-layout` | Node-link layout in 2D or 3D. | "Use `core/graph-layout` when you have nodes and links and need positions on a plane or in 3D." | [`AGENTS.md`](../core/graph-layout/AGENTS.md) |
| `timeline` | Chronology, parallel lanes, and branching event structures. | "Use `core/timeline` when the sim or page needs a horizontal chronology." | [`AGENTS.md`](../core/timeline/AGENTS.md) |
| `annotation` | Structured markup over text spans or image regions. | "Use `core/annotation` when a learner must mark up a passage of text or a region of an image with structured tags." | [`AGENTS.md`](../core/annotation/AGENTS.md) |
| `mind-map` | Rooted hierarchical concept maps. | "Use `core/mind-map` when you want to render or let a learner build a hierarchical outline rooted at a single concept." | [`AGENTS.md`](../core/mind-map/AGENTS.md) |
| `fsrs` | Spaced-repetition scheduling. | "Use `core/fsrs` whenever you need to decide when to show a learner a given review card next." | [`AGENTS.md`](../core/fsrs/AGENTS.md) |
| `bkt` | Bayesian knowledge tracing and mastery probability. | "Use `core/bkt` when you need a probability that a learner has mastered a particular concept." | [`AGENTS.md`](../core/bkt/AGENTS.md) |
| `algorithm-trace` | Stepwise traces for sorting, searching, traversal, and similar algorithms. | "Use `core/algorithm-trace` when a sim needs to show, step by step, how a standard sorting, searching, or traversal algorithm proceeds on a given input." | [`AGENTS.md`](../core/algorithm-trace/AGENTS.md) |
| `ui-sim` | Shared sim controls such as sliders, toggles, and drag handles. | "Use `core/ui-sim` for every interactive control inside a simulation." | [`AGENTS.md`](../core/ui-sim/AGENTS.md) |
| `ui-app` | App-shell UI primitives for catalogue and branch apps. | Contract pending; no `core/ui-app/AGENTS.md` exists yet. | Pending |
| `a11y` | Accessibility helpers and test affordances. | Contract pending; no `core/a11y/AGENTS.md` exists yet. | Pending |
| `aniegpt` | Canonical Anieyrudh Filter prompt and critique contract. | "Use `core/aniegpt` whenever an agent generates, reviews, or revises any artefact destined for a learner." | [`AGENTS.md`](../core/aniegpt/AGENTS.md) |

## Tier 2: Dependent

| Module | Purpose | When to consider | Contract |
| --- | --- | --- | --- |
| `sim-runtime` | PMOE-T runtime shell for interactive simulations. | "Use `core/sim-runtime` for every interactive simulation in the monorepo." | [`AGENTS.md`](../core/sim-runtime/AGENTS.md) |
| `three-scene` | Shared 3D scene boundary for genuinely three-dimensional sims. | "Use `core/three-scene` when the simulation's central object is genuinely three-dimensional." | [`AGENTS.md`](../core/three-scene/AGENTS.md) |
| `map-layers` | Map and geospatial layer runtime. | Contract pending; no `core/map-layers/AGENTS.md` exists yet. | Pending |

## Tier 3: Heavy Or Spec-Gap-Blocked

| Module | Purpose | When to consider | Contract |
| --- | --- | --- | --- |
| `notebook-runtime` | Code notebook execution surface. | Contract pending; no `core/notebook-runtime/AGENTS.md` exists yet. | Pending |
| `molecule` | Molecular structure and chemistry visualization. | Contract pending; no `core/molecule/AGENTS.md` exists yet. | Pending |
| `comparator` | Comparative matrix and side-by-side reasoning helpers. | Contract pending; no `core/comparator/AGENTS.md` exists yet. | Pending |
| `systems-dynamics` | Systems flow and stock-flow modeling helpers. | Contract pending; no `core/systems-dynamics/AGENTS.md` exists yet. | Pending |
| `argument-graph` | Argument graph modeling beyond simple graph layout. | Contract pending; no `core/argument-graph/AGENTS.md` exists yet. | Pending |
| `corpus` | Text corpus analysis and source retrieval helpers. | Contract pending; no `core/corpus/AGENTS.md` exists yet. | Pending |

## Build-Time Only

| Module | Purpose | When to consider | Contract |
| --- | --- | --- | --- |
| `scaffolder` | Container and package scaffolding CLI internals. | Build-time module; consumed by `pnpm container:new` and related skills. | Pending |
| `docs-templates` | Canonical templates copied into new containers. | Build-time module; use when scaffolding or regenerating container docs. | Templates only |
