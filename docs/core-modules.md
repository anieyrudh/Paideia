# Core Module Inventory

Core packages are shared contracts. Branch code consumes them; branch code does
not copy their logic, fork behavior for one institution, or inline formulas that
already belong in a kernel.

Status as of this inventory: every buildable `core/*/AGENTS.md` contract has a
workspace package except `core/aniegpt`, which is a prompt/filter asset rather
than a TypeScript kernel. `core/docs-templates` is template-only.

## How To Choose A Core

1. Start with the container's simulation need, not the subject label.
2. Read the target module's [`AGENTS.md`](../core/) before importing it.
3. If a sim is about to write reusable math, validation, layout, scheduling, or
   rendering primitives locally, stop and check this catalogue first.
4. If no core fits, open a core-change proposal before inventing branch-local
   behavior.

## Foundation And Governance

| Module | Package | Owns | Contract |
| --- | --- | --- | --- |
| `shared` | `@paideia/shared` | `KernelResult`, shared branded values, utility types. | [`AGENTS.md`](../core/shared/AGENTS.md) |
| `content-schema` | `@paideia/content-schema` | Zod schemas for containers, sims, concept maps, metadata, and validation. | [`AGENTS.md`](../core/content-schema/AGENTS.md) |
| `prediction-gate` | `@paideia/prediction-gate` | Predict-before-reveal persistence and reveal gating. | [`AGENTS.md`](../core/prediction-gate/AGENTS.md) |
| `aniegpt` | prompt asset | The Anieyrudh Filter prompt and critic contract. | [`AGENTS.md`](../core/aniegpt/AGENTS.md) |

## Simulation Runtime And UI

| Module | Package | Use When | Contract |
| --- | --- | --- | --- |
| `sim-runtime` | `@paideia/sim-runtime` | Mounting the PMOE-T runtime shell for interactive simulations. | [`AGENTS.md`](../core/sim-runtime/AGENTS.md) |
| `ui-sim` | `@paideia/ui-sim` | Building simulation controls such as sliders, toggles, readouts, and presets. | [`AGENTS.md`](../core/ui-sim/AGENTS.md) |
| `ui-app` | `@paideia/ui-app` | Building reusable app-shell surfaces such as catalogue search, module tabs, mastery summaries, and route chrome. | [`AGENTS.md`](../core/ui-app/AGENTS.md) |
| `a11y` | `@paideia/a11y` | Sharing accessibility severity filters, axe helpers, and test affordances. | [`AGENTS.md`](../core/a11y/AGENTS.md) |

## Visualisation And Structure

| Module | Package | Use When | Contract |
| --- | --- | --- | --- |
| `plotting` | `@paideia/plotting` | Rendering continuous 2D mathematical objects: functions, curves, fields, tangents, and overlays. | [`AGENTS.md`](../core/plotting/AGENTS.md) |
| `charting` | `@paideia/charting` | Rendering sampled or row-shaped quantitative data: lines, histograms, density curves, and bars. | [`AGENTS.md`](../core/charting/AGENTS.md) |
| `graph-layout` | `@paideia/graph-layout` | Positioning node-link graphs in 2D or 3D. | [`AGENTS.md`](../core/graph-layout/AGENTS.md) |
| `three-scene` | `@paideia/three-scene` | Defining the boundary for genuinely 3D scenes. | [`AGENTS.md`](../core/three-scene/AGENTS.md) |
| `map-layers` | `@paideia/map-layers` | Validating and styling map-shaped coordinate/layer data. | [`AGENTS.md`](../core/map-layers/AGENTS.md) |
| `timeline` | `@paideia/timeline` | Building chronologies, parallel lanes, and branching event structures. | [`AGENTS.md`](../core/timeline/AGENTS.md) |
| `annotation` | `@paideia/annotation` | Marking up text spans or image regions with structured tags. | [`AGENTS.md`](../core/annotation/AGENTS.md) |
| `mind-map` | `@paideia/mind-map` | Rendering or validating rooted hierarchical concept maps. | [`AGENTS.md`](../core/mind-map/AGENTS.md) |
| `argument-graph` | `@paideia/argument-graph` | Modelling claims, evidence, warrants, rebuttals, and critique paths. | [`AGENTS.md`](../core/argument-graph/AGENTS.md) |
| `comparator` | `@paideia/comparator` | Comparing designs, policies, options, or cases against explicit criteria. | [`AGENTS.md`](../core/comparator/AGENTS.md) |
| `corpus` | `@paideia/corpus` | Local source-pack indexing, chunking, search, and citation-safe text retrieval. | [`AGENTS.md`](../core/corpus/AGENTS.md) |

## Math And Learning Models

| Module | Package | Use When | Contract |
| --- | --- | --- | --- |
| `function-eval` | `@paideia/function-eval` | A learner or author supplies a math expression string that must become a callable function. | [`AGENTS.md`](../core/function-eval/AGENTS.md) |
| `numerical-math` | `@paideia/numerical-math` | Computing derivatives, integrals, slopes, sums, approximations, or simple regressions. | [`AGENTS.md`](../core/numerical-math/AGENTS.md) |
| `linear-algebra` | `@paideia/linear-algebra` | 2D vector arithmetic, 2x2 matrix transforms, eigen reasoning, and projections. | [`AGENTS.md`](../core/linear-algebra/AGENTS.md) |
| `vector-calculus` | `@paideia/vector-calculus` | Gradients, directional derivatives, tangent planes, divergence-style field reasoning, and local vector calculus quantities. | [`AGENTS.md`](../core/vector-calculus/AGENTS.md) |
| `probability-stats` | `@paideia/probability-stats` | Expected value, variance, quantiles, z-scores, Bayes normalisation, threshold metrics, and sampling distributions. | [`AGENTS.md`](../core/probability-stats/AGENTS.md) |
| `optimization` | `@paideia/optimization` | Gradient-descent paths, linear-programming feasible regions, objective optima, and newsvendor decisions. | [`AGENTS.md`](../core/optimization/AGENTS.md) |
| `uncertainty-propagation` | `@paideia/uncertainty-propagation` | Measurement uncertainty, percentage uncertainty, and arithmetic uncertainty propagation. | [`AGENTS.md`](../core/uncertainty-propagation/AGENTS.md) |
| `dimensional-analysis` | `@paideia/dimensional-analysis` | Deriving unit dimensions or rejecting equations between incompatible quantities. | [`AGENTS.md`](../core/dimensional-analysis/AGENTS.md) |
| `fsrs` | `@paideia/fsrs` | Scheduling the next review card after a learner response. | [`AGENTS.md`](../core/fsrs/AGENTS.md) |
| `bkt` | `@paideia/bkt` | Estimating concept mastery probability for progression or mastery displays. | [`AGENTS.md`](../core/bkt/AGENTS.md) |

## Algorithms, Systems, And Data

| Module | Package | Use When | Contract |
| --- | --- | --- | --- |
| `algorithm-trace` | `@paideia/algorithm-trace` | Showing stepwise sorting, searching, traversal, or traceable algorithm execution. | [`AGENTS.md`](../core/algorithm-trace/AGENTS.md) |
| `graph-algorithms` | `@paideia/graph-algorithms` | Computing canonical graph traversal, path, and graph reasoning results. | [`AGENTS.md`](../core/graph-algorithms/AGENTS.md) |
| `digital-logic` | `@paideia/digital-logic` | Evaluating binary gates, truth tables, combinational logic, and simple sequential logic. | [`AGENTS.md`](../core/digital-logic/AGENTS.md) |
| `relational-data` | `@paideia/relational-data` | Validating tables, joins, projections, selections, and relational examples. | [`AGENTS.md`](../core/relational-data/AGENTS.md) |
| `functional-dependencies` | `@paideia/functional-dependencies` | Computing closure, keys, dependency implications, and normalisation reasoning. | [`AGENTS.md`](../core/functional-dependencies/AGENTS.md) |
| `indexing-query-cost` | `@paideia/indexing-query-cost` | Modelling page I/O, simple index choices, and query-cost comparisons. | [`AGENTS.md`](../core/indexing-query-cost/AGENTS.md) |
| `transactions` | `@paideia/transactions` | Reasoning about schedules, conflicts, serialisability, and transaction traces. | [`AGENTS.md`](../core/transactions/AGENTS.md) |
| `dynamical-systems` | `@paideia/dynamical-systems` | Stepping ODEs, comparing vector fields, and classifying basic local dynamics. | [`AGENTS.md`](../core/dynamical-systems/AGENTS.md) |
| `systems-dynamics` | `@paideia/systems-dynamics` | Building causal stock-flow models, feedback loops, and simple system evolution. | [`AGENTS.md`](../core/systems-dynamics/AGENTS.md) |
| `time-series` | `@paideia/time-series` | Computing moving averages, exponential smoothing, simple forecasts, and time-series diagnostics. | [`AGENTS.md`](../core/time-series/AGENTS.md) |
| `model-evaluation` | `@paideia/model-evaluation` | Computing classification metrics, confusion matrices, threshold tradeoffs, and model-evaluation summaries. | [`AGENTS.md`](../core/model-evaluation/AGENTS.md) |

## Physical, Engineering, And Applied Kernels

| Module | Package | Use When | Contract |
| --- | --- | --- | --- |
| `mechanics` | `@paideia/mechanics` | Shared force, motion, energy, momentum, and equilibrium calculations. | [`AGENTS.md`](../core/mechanics/AGENTS.md) |
| `electromagnetism` | `@paideia/electromagnetism` | Point-charge fields, potentials, magnetic-force quantities, and related canonical EM calculations. | [`AGENTS.md`](../core/electromagnetism/AGENTS.md) |
| `circuits` | `@paideia/circuits` | Ohm's law, equivalent resistance, dividers, DC operating points, RLC impedance, and phasors. | [`AGENTS.md`](../core/circuits/AGENTS.md) |
| `control-systems` | `@paideia/control-systems` | Transfer functions, PID loops, Bode samples, closed-loop response, and step response metrics. | [`AGENTS.md`](../core/control-systems/AGENTS.md) |
| `waves` | `@paideia/waves` | Wave speed, frequency, wavelength, phase, interference, and simple superposition calculations. | [`AGENTS.md`](../core/waves/AGENTS.md) |
| `chemistry` | `@paideia/chemistry` | Quantitative chemistry such as moles, concentration, limiting reagents, pH, equilibrium, and thermochemistry primitives. | [`AGENTS.md`](../core/chemistry/AGENTS.md) |
| `molecule` | `@paideia/molecule` | Local molecule graph validation, formula/mass derivation, bond totals, valence diagnostics, and deterministic 2D layout. | [`AGENTS.md`](../core/molecule/AGENTS.md) |
| `materials` | `@paideia/materials` | Material property validation, stress/strain inputs, and material selection reasoning. | [`AGENTS.md`](../core/materials/AGENTS.md) |
| `structural-analysis` | `@paideia/structural-analysis` | Stress, axial response, load paths, and simple structural demand checks. | [`AGENTS.md`](../core/structural-analysis/AGENTS.md) |
| `fluid-mechanics` | `@paideia/fluid-mechanics` | Reynolds number, pressure loss, buoyancy, continuity, and Bernoulli-style calculations. | [`AGENTS.md`](../core/fluid-mechanics/AGENTS.md) |
| `heat-transfer` | `@paideia/heat-transfer` | Conduction, convection, heat-rate, and thermal-resistance calculations. | [`AGENTS.md`](../core/heat-transfer/AGENTS.md) |
| `thermodynamics` | `@paideia/thermodynamics` | Temperature conversion, ideal gas quantities, energy balances, efficiency, and entropy-style primitives. | [`AGENTS.md`](../core/thermodynamics/AGENTS.md) |
| `finance` | `@paideia/finance` | Present value, NPV, IRR, payback, annuities, and applied finance decisions. | [`AGENTS.md`](../core/finance/AGENTS.md) |
| `queueing-systems` | `@paideia/queueing-systems` | Little's Law, queue utilisation, wait estimates, and simple service-system tradeoffs. | [`AGENTS.md`](../core/queueing-systems/AGENTS.md) |
| `scheduling` | `@paideia/scheduling` | FCFS, SPT, EDD, critical-ratio, lateness, and schedule comparison logic. | [`AGENTS.md`](../core/scheduling/AGENTS.md) |

## Build-Time Assets

| Module | Package | Owns | Contract |
| --- | --- | --- | --- |
| `docs-templates` | template files | Canonical files copied into new containers and package docs. | [`core/docs-templates`](../core/docs-templates/) |
