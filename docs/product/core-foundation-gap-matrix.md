# Core Foundation Gap Matrix

This matrix decides whether a container can be assigned now or must wait for a
shared kernel. It keeps contributors from implementing reusable maths, physics,
statistics, or domain logic inside one-off simulations.

## Policy

Do not promote a queue item to `ready-for-build` unless its reusable computation
is already covered by `core/*`, or the PR also lands the missing kernel first.

Status meanings:

| Status | Meaning |
| --- | --- |
| `ready` | Existing kernels are enough for product-quality container work |
| `kernel-needed` | Build or extend a shared kernel before assigning containers |
| `design-needed` | The correct abstraction is unclear; write an ADR or first-container design note |
| `visual-only-ok` | A visual/explanatory container may proceed, but `TECHNICAL.md` must state computational limits |

## Existing Foundations

| Foundation | Existing core modules |
| --- | --- |
| Container and schema contract | `core/content-schema`, `core/shared` |
| Prediction and reveal control | `core/prediction-gate` |
| Simulation runtime and UI composition | `core/sim-runtime`, `core/ui-sim`, `core/three-scene` |
| General computation and visuals | `core/function-eval`, `core/numerical-math`, `core/plotting`, `core/charting`, `core/graph-layout`, `core/timeline`, `core/annotation`, `core/mind-map` |
| Learning state | `core/fsrs`, `core/bkt` |
| Maths and engineering | `core/linear-algebra`, `core/dynamical-systems`, `core/optimization`, `core/mechanics`, `core/circuits`, `core/control-systems`, `core/electromagnetism`, `core/dimensional-analysis`, `core/uncertainty-propagation`, `core/vector-calculus`, `core/waves`, `core/thermodynamics`, `core/heat-transfer`, `core/fluid-mechanics`, `core/structural-analysis` |
| Probability, algorithms, and data systems | `core/probability-stats`, `core/graph-algorithms`, `core/algorithm-trace`, `core/queueing-systems`, `core/scheduling`, `core/relational-data`, `core/functional-dependencies`, `core/indexing-query-cost`, `core/transactions` |
| Chemistry and materials | `core/chemistry`, `core/materials`, `core/molecule` |
| Biology and healthcare | `core/sequence`, `core/membrane-transport`, `core/cell-geometry`, `core/protein-structure`, `core/gene-regulatory-network`, `core/signal-pathway`, `core/cell-cycle`, `core/immunology`, `core/oncogenetics`, `core/treatment-response` |
| Evaluation and business models | `core/model-evaluation`, `core/finance` |

## Domain Readiness

| Domain family | Queue coverage | Status | Missing or next kernel |
| --- | --- | --- | --- |
| A-Level mechanics and vectors | Physics Tables 1-2 | `ready` | Extend `core/mechanics` only when a container exposes a missing equation family |
| A-Level probability and inference | Math Table 2, SUTD 10.022 | `ready` | Extend `core/probability-stats` for distribution-specific gaps |
| Linear algebra and vector transformations | SUTD 10.018, ML, controls | `ready` | Extend `core/linear-algebra` for decompositions as needed |
| Optimisation and LP | SUTD ESD, ML, Analytics Edge | `ready` | Extend `core/optimization` for integer or nonlinear optimisation |
| Control systems and signals | DSIS, EPD, Electronics | `ready` | Extend `core/control-systems` for filters, Bode, time response gaps |
| Circuits and electromagnetism | A-Level Physics, SUTD Electronics | `ready` | Extend `core/circuits` and `core/electromagnetism` as containers demand |
| Graph algorithms and CS basics | SUTD CSD | `ready` | Extend `core/graph-algorithms` and `core/algorithm-trace` for DP/sorting/runtime visualisers |
| Dimensional analysis and uncertainty | A-Level Physics foundations | `ready` | Extend `core/uncertainty-propagation` for correlated uncertainty |
| Thermodynamics and energy systems | SUTD 10.023, A-Level thermal physics | `ready` | Extend `core/thermodynamics` / `core/heat-transfer` only when a container exposes an energy-system gap |
| Fluid mechanics | SUTD 30.103 | `ready` | Extend `core/fluid-mechanics` for turbulence, pump curves, or compressible-flow gaps |
| Waves, optics, acoustics | A-Level waves/oscillations, SMT, DSIS | `ready` | `core/waves` covers wave containers; add `core/optics` or `core/acoustics` only for optics/acoustics-specific rows |
| Chemistry | Future A-Level chemistry and SUTD healthcare chemistry-adjacent topics | `ready` | `core/chemistry`, `core/materials`, and `core/molecule` cover current rows; add reaction kinetics or equilibrium only when needed |
| Biology and healthcare systems | SUTD 10.019 | `ready` | Current healthcare rows are covered by `core/sequence`, `core/membrane-transport`, `core/cell-geometry`, `core/protein-structure`, `core/gene-regulatory-network`, `core/signal-pathway`, `core/cell-cycle`, `core/immunology`, `core/oncogenetics`, and `core/treatment-response` |
| Machine learning | SUTD 50.007, Analytics Edge | `kernel-needed` | `core/ml-basics`, `core/regression`, `core/classification`, `core/model-selection` |
| Databases and SQL | SUTD 50.043, DBA SQL row | `ready` | `core/relational-data`, `core/functional-dependencies`, `core/indexing-query-cost`, and `core/transactions` cover relational models; add `core/sql-lab` only for SQL parsing/execution rows |
| Finance and accounting-style models | SUTD DBA finance rows | `ready` | `core/finance` covers current finance models; A-Level POA/MOB are out of scope |
| Operations and queueing | SUTD MSO, ESD systems | `ready` | `core/queueing-systems` and `core/scheduling` cover queue/schedule rows; add inventory models when a queue row requires them |
| Architecture and daylighting | SUTD ASD | `ready` | `core/structural-analysis` covers current structural rows; add `core/daylight-geometry` or `core/spatial-analysis` for daylight/spatial rows |
| AI trust and evaluation | SUTD DAI | `ready` | `core/model-evaluation`, `core/probability-stats`, and `core/annotation` cover current evaluation rows; add fairness/classification kernels only when needed |

## Recommended Foundation Build Order

Build foundations in this order so the largest number of containers become
safe to assign:

1. `core/ml-basics`, `core/regression`, and `core/classification` for broader ML containers.
2. `core/fairness-metrics` for deeper DAI fairness containers.
3. `core/sql-lab` or `core/query-engine` for SQL execution containers.
4. `core/inventory-models` for inventory and supply-chain containers.
5. `core/reaction-kinetics` and `core/equilibrium` for advanced chemistry containers.
6. `core/optics` and `core/acoustics` for optics/acoustics-specific containers.
7. `core/daylight-geometry` and `core/spatial-analysis` for deeper ASD daylight/spatial containers.

Each foundation should follow the normal kernel workflow:

- read `core/<module>/AGENTS.md` or create one before implementation;
- export a small public API;
- return `KernelResult` for recoverable domain errors;
- avoid hidden mutable global state;
- include meaningful unit and property tests;
- document invariants in `TECHNICAL.md`;
- keep runtime dependencies compatible with `LICENSES.json`.

## Queue Promotion Rule

When promoting items from `docs/product/container-table-queue.yaml`:

1. Confirm the row's required computation maps to `ready` domains above.
2. If the row maps to `kernel-needed`, create or assign the kernel PR first.
3. If the row maps to `design-needed`, write a short ADR or first-container
   design note before assigning builders.
4. Promote only a small wave at a time.
5. Keep one queue item per branch and PR.
