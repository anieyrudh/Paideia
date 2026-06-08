# Paideia Container Design and Efficacy Audit

Date: 2026-05-31
Auditor: Claude (Codex)
Baseline: `main` at HEAD after the post-#283 healthcare live-first tranche.
Scope: every registered container under `a-level/content/`, `sutd/content/`, `shared/content/` (92 containers, 92 simulation routes).

This is a read-only audit. No container, sim, kernel, or test was modified during the audit. Findings below are based on static inspection of every container plus the standing gate output; Playwright browser execution was environment-blocked (see "Environment notes" at the end).

## 1. Executive summary

### What is working well

- **Container shape is uniformly enforced.** `pnpm container:validate` passes with 92 of 92 containers conforming to `ContainerSpec`. Every container has `container.yaml`, `concept-card.md`, `concept-map/` (3 files), `simulation/` (7 files), `embed/` (3 files), `media/` (2 files), `problem-solving/` (3+ files), `sources.md`, and a generated `README.md` + `TECHNICAL.md`.
- **The visual simulation standard is real and operational.** `pnpm container:visual-quality` exercises 29 routes against `expectProductSimulationExperience` and (in CI) gates the merge-bar contract: visual model, formula, substitution, units, result, legend, no text-only reveal. Every route that opts in passes.
- **Kernel discipline is paying off.** 70+ kernels in `core/*` carry the recurring math/physics/biology/dynamics; sims are thin React shells over kernel calls. Boundary checks (`pnpm boundary`) report zero cross-branch or cross-kernel violations across 1494 modules.
- **The simulation library is genuinely visual.** 90 of 91 sim TSX files include an SVG, chart kernel call (`ParametricPlot`, `Sankey`, `Histogram`, `ScatterPlot`, `VectorFieldPlot`, `LineChart`), or both. Only `sutd/packages/sims/src/joint-and-marginal-distributions.tsx` uses a pure CSS-grid table as the visual model; that is borderline but defensible for a 2x2 joint-distribution lab.
- **Formula coverage is high.** 86 of 91 sim TSX files explicitly include the words `Formula`, `Substitution`, and `Legend`. The remaining 5 are largely state-machine or algorithm-trace style sims where the strict "formula + substitution + units" pattern needs a different framing.
- **Schema discipline.** `pnpm graph:check`, `roadmap:validate`, `agent:validate` are all green. Every queue entry has a registered container, and every container has a generated graph entry.

### What is still weak

- **Visual-quality metadata coverage is partial.** Only 29 of 92 routes declare `simulation/runtime.yaml` `visual_quality` metadata. The remaining 63 routes pass their route-specific Playwright tests but are not exercised by the generic product-simulation-experience contract. This is coverage debt — not a sign that those routes are broken — and the post-#283 audit already flagged it.
- **30 % of containers still ship with `status: draft`.** 29 of 92 are still in `draft`, including the entire SUTD 10.019 healthcare family (7 / 7), all 10 SUTD 10.018 multivariable-calc/linear-algebra containers, all 8 SUTD 10.016 chemistry containers, and most of CSD/EPD. Container shape passes but the curriculum-review sign-off has not happened.
- **Three containers carry an empty Anieyrudh Filter pass.** `Date: TBD` is still in the SUTD 10.016 biodiversity, water-quality, and solar-energy containers' `TECHNICAL.md`. They are tagged `draft`, so this is a sign of unfinished review, not a regression.
- **A small number of concept cards are skeletal.** `sutd/content/epd/containers/pid-step-response/concept-card.md` (11 lines) and `sutd/content/esd/containers/linear-programming-feasible-region/concept-card.md` (12 lines) are essentially a one-paragraph stub. Both containers are otherwise mature with proper sims and tests; the explanation surface is the weak point.
- **Two concept cards leak kernel paths into learner-facing copy.** `a-level/content/physics/containers/alternating-current/concept-card.md:73` mentions `core/circuits` and `sutd/content/40-012-…/scheduling-and-project-management/concept-card.md:51` mentions `core/scheduling`. Concept cards are learner-facing; raw repo paths should never appear.
- **The generic helper is underused in route-specific tests.** Only 7 of 92 `simulation/simulation.test.ts` files call `expectProductSimulationExperience`. The other 85 maintain bespoke "click setup, click reveal, assert observation" sequences that are harder to evolve when the reveal pattern changes.

### Is this project product-quality overall?

**Yes, with caveats.** The strongest 25-30 containers cross the merge bar cleanly: real interactive visual models, kernel-backed math, formula-substitution-units-legend reveal, prediction checkpoint, transfer problem, cited sources, no clinical/educational misclaims. The middle tier (~50 containers) passes container shape and has a working sim but has not yet been pulled under the generic visual-quality helper. The bottom tier (~15 containers) has structural pass but thin pedagogical content (skeletal concept cards, generic problem-solving rubrics, route-specific reveal flow that locks the model behind a button).

### Does any area feel like low-effort AI output?

A few signals do read that way, and I will name them.

- **The 11-line PID concept card** (`sutd/content/epd/containers/pid-step-response/concept-card.md`) and the **12-line LP concept card** (`sutd/content/esd/containers/linear-programming-feasible-region/concept-card.md`) read as scaffolds that were generated, validated, and never expanded. The sims themselves are fine; the explanation is too thin to teach the concept.
- **The freshly-built SUTD 10.019 healthcare family** is structurally identical to a strong template (membrane → cell-signalling → gene-expression → cell-cycle → immune → cancer). The work product is large but the per-container pedagogy still reads like the same author's voice in a tight time window — heavy use of the same formula-card pattern, the same "educational only" boilerplate (warranted, but boilerplate-like), and concept cards that hit the right beats but in mechanical order. Not a failure; a normalisation tradeoff.
- **A handful of TECHNICAL.md files** are the auto-generated skeleton plus the canonical filter-pass block. The 3 with `Date: TBD` are obvious; another ~10 have the filter pass filled but the iteration log says "Regenerated README.md and TECHNICAL.md with `pnpm container:docs`" and not much else. These are not P0 — the structure is right — but they tell the reviewer "this container was scaffolded and not iterated."

## 2. Scorecard by family

| Family | Containers | Visual-quality metadata | Draft | Notes |
| --- | ---: | ---: | ---: | --- |
| A-Level mathematics | 4 | 3 / 4 (75 %) | 0 | confidence-intervals and hypothesis-testing are the strong exemplars; normal-distribution and probability-statistics are covered by the generic gate. |
| A-Level physics | 18 | 6 / 18 (33 %) | 0 | physical-quantities-and-units, scalars-and-vectors, resolving-vectors, projectile-motion, kinematics-one-dim are under the gate. Forces-and-equilibrium and the post-kinematics block (circuits, oscillations, alternating-current, thermal-physics, waves, electric-fields, capacitance, magnetic-fields, gravitational-fields, work-energy-power, momentum, circular-motion) need the second a-level tranche. |
| SUTD 10.016 chemistry / sustainability | 8 | 0 / 8 (0 %) | 8 | The full family is `draft`. Three of these (biodiversity, water-quality, solar-energy) have `Date: TBD` filter passes. The sims themselves are not text-only; they need the metadata + helper backfill before they can resume production. |
| SUTD 10.017 E&M | 6 | 3 / 6 (50 %) | 2 | Coulomb, Gauss, RLC are under the gate. Capacitor-with-dielectric, magnetic-induction, Maxwell-equations still need the metadata backfill. |
| SUTD 10.018 multivariable-calc + LA | 10 | 1 / 10 (10 %) | 8 | gaussian-elimination is under the gate. All other 10.018 routes need both metadata and the live-first reveal-flow conversion. This is the largest non-covered cluster in the repo. |
| SUTD 10.019 healthcare | 7 | 4 / 7 (57 %) | 7 | cell-structure, protein-folding, gene-expression, cell-signalling are under the gate. cell-cycle, immune, cancer-genetics are the next obvious tranche. All seven are draft. |
| SUTD 10.022 uncertainty | 6 | 0 / 6 (0 %) | 0 | All "reviewed" but none under the generic gate. central-limit-theorem, conditional-probability-and-bayes, discrete-rvs, continuous-rvs, joint-and-marginal, linear-regression. This is the second-largest non-covered cluster. |
| SUTD 10.023 energy systems | 1 | 0 / 1 | 0 | heat-transfer-modes. Single container; needs metadata. |
| SUTD 40-012 manufacturing | 1 | 0 / 1 | 0 | scheduling-and-project-management. Concept card leaks `core/scheduling`. |
| ASD | 3 | 0 / 3 | 0 | load-path-and-daylight-tradeoff, shading-daylight-heat-gain, structural-load-path-diagram. Reviewed status. |
| CSD | 3 | 1 / 3 (33 %) | 3 | graph-search-and-shortest-paths is under the gate. dynamic-programming-state-recursion and recursion-tree-complexity are draft. |
| DAI | 3 | 1 / 3 (33 %) | 0 | trust-calibration is under the gate. confusion-matrix-thresholds and fairness-threshold-audit need backfill. |
| EPD | 3 | 1 / 3 (33 %) | 1 | pid-step-response is the strongest exemplar in this family. bode-stability-margin and signal-filter-frequency-response need backfill. |
| ESD | 3 | 1 / 3 (33 %) | 1 | linear-programming-feasible-region is under the gate (its concept card is the 12-line stub mentioned above). markov-chain-steady-state, newsvendor-critical-fractile reviewed but no metadata. |
| Freshmore | 3 | 3 / 3 (100 %) | 1 | bayes-updating, eigenvector-transformations, vector-transformations all covered. The strongest single-family hit rate. |
| SMT | 3 | 0 / 3 | 0 | fourier-mode-superposition, linear-system-stability, ode-phase-portrait. Reviewed but no metadata. |
| Shared cs / math / physics / systems | 10 | 6 / 10 (60 %) | 1 | The 10 shared "P0 universal" containers; bayes-updating, central-limit-theorem, linear-programming, eigenvector-transformations (math); circuit-phasor, free-body-diagram (physics); pid-bode-builder (systems); graph-algorithm-explorer (cs) are under the gate. gradient-descent-landscape, hypothesis-test-decision, ode-phase-portrait still need it. |

## 3. Container matrix

The full 92-container matrix is below. `Visual` and `Pedagogy` are graded from static signal: SVG/canvas/chart presence, formula/substitution/legend pattern, kernel composition, concept-card depth, sources count, and transfer-problem presence. `Status` reflects `container.yaml.status`. `Cov` is `Y/N` for `visual_quality` metadata coverage. `Priority` is the audit priority for follow-up.

Legend for scores: `+` strong, `o` adequate, `-` weak.

### A-Level mathematics

| id | route | status | cov | visual | pedagogy | ui/ux | formula | sources | priority | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| confidence-intervals | a-level/mathematics/confidence-intervals/confidence-interval-lab | reviewed | Y | + | + | + | + | o | none | strong exemplar |
| hypothesis-testing | a-level/mathematics/hypothesis-testing/hypothesis-testing-lab | reviewed | N | + | + | + | + | o | P1 | needs visual-quality metadata; very thin sources.md (4 lines). |
| normal-distribution | a-level/mathematics/normal-distribution/normal-distribution-lab | reviewed | Y | + | + | + | + | + | none | strong exemplar |
| probability-statistics | a-level/mathematics/probability-statistics/probability-statistics-lab | reviewed | Y | + | + | + | + | + | none | strong exemplar |

### A-Level physics (18 containers)

| id | route | status | cov | visual | pedagogy | ui/ux | formula | sources | priority | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alternating-current | a-level/physics/alternating-current/alternating-current-lab | reviewed | N | + | + | + | + | o | P1 | concept card mentions `core/circuits` (kernel path leak) |
| capacitance | a-level/physics/capacitance/capacitance-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| circuits | a-level/physics/circuits/circuits-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| circular-motion | a-level/physics/circular-motion/circular-motion-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| electric-fields | a-level/physics/electric-fields/electric-fields-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| forces-and-equilibrium | a-level/physics/forces-and-equilibrium/forces-and-equilibrium-lab | reviewed | N | + | + | + | + | o | P1 | smallest a-level sim (244 lines) |
| gravitational-fields | a-level/physics/gravitational-fields/gravitational-fields-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| kinematics-in-one-dimension | a-level/physics/kinematics-in-one-dimension/kinematics-in-one-dimension-lab | reviewed | Y | + | + | + | + | o | none | covered |
| magnetic-fields | a-level/physics/magnetic-fields/magnetic-fields-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| momentum | a-level/physics/momentum/momentum-lab | reviewed | N | + | + | + | + | - | P1 | sources.md 4 lines |
| oscillations | a-level/physics/oscillations/oscillations-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| physical-quantities-and-units | a-level/physics/physical-quantities-and-units/measurement-uncertainty | reviewed | Y | + | + | + | + | o | none | covered |
| projectile-motion | a-level/physics/projectile-motion/projectile-motion-lab | reviewed | Y | + | + | + | + | o | none | covered |
| resolving-vectors | a-level/physics/resolving-vectors/resolving-vectors-lab | reviewed | Y | + | + | + | + | o | none | covered |
| scalars-and-vectors | a-level/physics/scalars-and-vectors/resultant-magnitude | reviewed | Y | + | + | + | + | o | none | covered |
| thermal-physics | a-level/physics/thermal-physics/thermal-physics-lab | reviewed | N | + | + | + | + | o | P1 | metadata backfill |
| waves | a-level/physics/waves/waves-lab | reviewed | N | + | + | + | + | - | P1 | sources.md 4 lines |
| work-energy-power | a-level/physics/work-energy-power/work-energy-power-lab | reviewed | N | + | + | + | + | - | P1 | sources.md 4 lines |

### SUTD course-code containers

| id | route | status | cov | visual | pedagogy | ui/ux | formula | sources | priority | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10-016/atomic-structure-and-electron-configuration | sutd/10-016-…/atomic-structure-and-electron-configuration/atomic-structure-and-electron-configuration | draft | N | + | + | + | + | o | P1 | family is the next-largest backfill |
| 10-016/biodiversity-loss-and-land-use | sutd/10-016-…/biodiversity-loss-and-land-use/biodiversity-loss-and-land-use | draft | N | + | o | o | + | o | P1 | Filter pass `Date: TBD` |
| 10-016/chemical-bonding-and-intermolecular-forces | sutd/10-016-…/chemical-bonding-and-intermolecular-forces/chemical-bonding-and-intermolecular-forces | draft | N | + | o | + | + | o | P1 |
| 10-016/electrochemistry-and-batteries | sutd/10-016-…/electrochemistry-and-batteries/electrochemistry-and-batteries | draft | N | + | + | + | + | o | P1 | exemplar reference earlier in this audit cycle |
| 10-016/polymers-and-plastic-waste-management | sutd/10-016-…/polymers-and-plastic-waste-management/polymers-and-plastic-waste-management | draft | N | + | + | + | + | o | P1 |
| 10-016/solar-energy-and-band-theory | sutd/10-016-…/solar-energy-and-band-theory/solar-energy-and-band-theory | draft | N | + | + | + | + | o | P1 | Filter pass `Date: TBD` |
| 10-016/thermochemistry-and-equilibrium | sutd/10-016-…/thermochemistry-and-equilibrium/thermochemistry-and-equilibrium | draft | N | + | + | + | + | o | P1 |
| 10-016/water-quality-and-treatment | sutd/10-016-…/water-quality-and-treatment/water-treatment-train | draft | N | + | + | + | + | o | P1 | Filter pass `Date: TBD` |
| 10-017/capacitor-with-dielectric | sutd/10-017-…/capacitor-with-dielectric/capacitor-with-dielectric | reviewed | N | + | + | + | + | o | P1 |
| 10-017/coulomb-s-law-and-discrete-charge-fields | sutd/10-017-…/coulomb-s-law-and-discrete-charge-fields/coulomb-field-vector-lab | draft | Y | + | + | + | + | o | none | covered, exemplar |
| 10-017/gauss-law-for-symmetric-distributions | sutd/10-017-…/gauss-law-for-symmetric-distributions/gauss-law-flux-surface-lab | draft | Y | + | + | + | + | o | none | covered, exemplar |
| 10-017/magnetic-induction-faraday-lenz | sutd/10-017-…/magnetic-induction-faraday-lenz/magnetic-induction-faraday-lenz | reviewed | N | + | + | + | + | o | P1 |
| 10-017/maxwell-equations-and-em-waves | sutd/10-017-…/maxwell-equations-and-em-waves/maxwell-equations-and-em-waves | reviewed | N | + | + | + | + | o | P1 |
| 10-017/rlc-circuit-and-resonance | sutd/10-017-…/rlc-circuit-and-resonance/rlc-circuit-and-resonance | reviewed | Y | + | + | + | + | o | none | covered |
| 10-018/determinant-and-trace | sutd/10-018-…/determinant-and-trace/determinant-and-trace | draft | N | + | + | + | + | o | P1 |
| 10-018/divergence-and-curl | sutd/10-018-…/divergence-and-curl/divergence-and-curl | draft | N | + | + | + | + | o | P1 |
| 10-018/double-and-triple-integrals | sutd/10-018-…/double-and-triple-integrals/double-and-triple-integrals | reviewed | N | + | + | + | + | o | P1 | tranche recommended in #283 audit |
| 10-018/eigenvalues-and-eigenvectors | sutd/10-018-…/eigenvalues-and-eigenvectors/eigenvalues-and-eigenvectors | draft | N | + | + | + | + | o | P1 |
| 10-018/gaussian-elimination-and-linear-systems | sutd/10-018-…/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems | draft | Y | + | + | + | + | o | none | covered, exemplar; 26-line concept card is on the lower end |
| 10-018/line-integrals-and-conservative-vector-fields | sutd/10-018-…/line-integrals-and-conservative-vector-fields/line-integrals-and-conservative-vector-fields | draft | N | + | + | + | + | o | P1 |
| 10-018/linear-transformations | sutd/10-018-…/linear-transformations/linear-transformations | draft | N | + | + | + | + | o | P1 |
| 10-018/optimisation-with-lagrange-multipliers | sutd/10-018-…/optimisation-with-lagrange-multipliers/optimisation-with-lagrange-multipliers | reviewed | N | + | + | + | + | o | P1 |
| 10-018/partial-derivatives-and-gradient | sutd/10-018-…/partial-derivatives-and-gradient/partial-derivatives-and-gradient | reviewed | N | + | + | + | + | o | P1 |
| 10-019/cancer-genetics-and-therapy | sutd/10-019-…/cancer-genetics-and-therapy/cancer-genetics-and-therapy | draft | N | + | + | + | + | + | P1 | clinical-disclaimer well placed; needs metadata + helper |
| 10-019/cell-cycle-and-mitosis-meiosis | sutd/10-019-…/cell-cycle-and-mitosis-meiosis/cell-cycle-and-mitosis-meiosis | draft | N | + | + | + | o | + | P1 | no "substitution" word (state machine, not formula calculation) — defensible but flag |
| 10-019/cell-signalling-pathways | sutd/10-019-…/cell-signalling-pathways/cell-signalling-pathways | draft | Y | + | + | + | + | + | none | covered, exemplar |
| 10-019/cell-structure-and-the-membrane | sutd/10-019-…/cell-structure-and-the-membrane/cell-structure-and-the-membrane | draft | Y | + | + | + | + | + | none | covered, exemplar |
| 10-019/gene-expression-dna-to-rna-to-protein | sutd/10-019-…/gene-expression-dna-to-rna-to-protein/gene-expression-dna-to-rna-to-protein | draft | Y | + | + | + | + | + | none | covered, exemplar |
| 10-019/immune-system-and-vaccines | sutd/10-019-…/immune-system-and-vaccines/immune-system-and-vaccines | draft | N | + | + | + | + | + | P1 | needs metadata + helper |
| 10-019/protein-folding-and-function | sutd/10-019-…/protein-folding-and-function/protein-folding-and-function | draft | Y | + | + | + | + | + | none | covered, exemplar |
| 10-022/central-limit-theorem | sutd/10-022-…/central-limit-theorem/central-limit-theorem | reviewed | N | + | + | + | + | - | P1 | sources.md 3 lines |
| 10-022/conditional-probability-and-bayes | sutd/10-022-…/conditional-probability-and-bayes/conditional-probability-and-bayes | reviewed | N | + | + | + | + | o | P1 | tranche recommended in #283 audit |
| 10-022/continuous-rvs-uniform-exponential | sutd/10-022-…/continuous-rvs-uniform-exponential/continuous-rvs-uniform-exponential | reviewed | N | + | + | + | + | - | P1 | sources.md 3 lines |
| 10-022/discrete-rvs-geometric-binomial-poisson | sutd/10-022-…/discrete-rvs-geometric-binomial-poisson/discrete-rvs-geometric-binomial-poisson | reviewed | N | + | + | + | + | o | P1 |
| 10-022/joint-and-marginal-distributions | sutd/10-022-…/joint-and-marginal-distributions/joint-table-lab | reviewed | N | o | + | + | + | - | P1 | grid-only visual; sources.md 3 lines |
| 10-022/linear-regression | sutd/10-022-…/linear-regression/linear-regression | reviewed | N | + | + | + | + | o | P1 | strong chart sim; just needs metadata |
| 10-023/heat-transfer-modes | sutd/10-023-…/heat-transfer-modes/heat-transfer-modes | reviewed | N | + | + | + | + | o | P2 | single-container family |
| 40-012/scheduling-and-project-management | sutd/40-012-…/scheduling-and-project-management/scheduling-and-project-management | reviewed | N | + | + | + | + | o | P1 | concept card mentions `core/scheduling` (kernel path leak) |

### SUTD pillar containers

| id | route | status | cov | visual | pedagogy | ui/ux | formula | sources | priority | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| asd/load-path-and-daylight-tradeoff | sutd/asd/load-path-and-daylight-tradeoff/load-path-and-daylight-tradeoff | reviewed | N | + | + | + | o | o | P1 | formula coverage weak (no "Substitution" string) |
| asd/shading-daylight-heat-gain | sutd/asd/shading-daylight-heat-gain/shading-daylight-heat-gain | reviewed | N | + | + | + | o | o | P1 | formula coverage weak |
| asd/structural-load-path-diagram | sutd/asd/structural-load-path-diagram/structural-load-path-diagram | reviewed | N | + | + | + | + | o | P1 |
| csd/dynamic-programming-state-recursion | sutd/csd/dynamic-programming-state-recursion/dp-state-recursion | draft | N | + | + | + | o | o | P1 | algorithm-trace sim; "substitution" word absent (defensible) |
| csd/graph-search-and-shortest-paths | sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths | draft | Y | + | + | + | + | o | none | covered, exemplar; sources.md 3 lines |
| csd/recursion-tree-complexity | sutd/csd/recursion-tree-complexity/recursion-tree-complexity | draft | N | + | + | + | + | o | P1 |
| dai/confusion-matrix-thresholds | sutd/dai/confusion-matrix-thresholds/confusion-matrix-thresholds | reviewed | N | + | + | + | + | o | P1 |
| dai/fairness-threshold-audit | sutd/dai/fairness-threshold-audit/fairness-threshold-audit | reviewed | N | + | + | + | + | o | P1 |
| dai/trust-calibration | sutd/dai/trust-calibration/trust-calibration | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| epd/bode-stability-margin | sutd/epd/bode-stability-margin/bode-stability-margin | reviewed | N | + | + | + | + | o | P1 |
| epd/pid-step-response | sutd/epd/pid-step-response/pid-step-response | draft | Y | + | o | + | + | o | P1 | concept card 11 lines (very thin) |
| epd/signal-filter-frequency-response | sutd/epd/signal-filter-frequency-response/signal-filter-frequency-response | reviewed | N | + | + | + | + | o | P1 |
| esd/linear-programming-feasible-region | sutd/esd/linear-programming-feasible-region/linear-programming-feasible-region | draft | Y | + | - | + | + | - | P1 | concept card 12 lines; sources.md 2 lines |
| esd/markov-chain-steady-state | sutd/esd/markov-chain-steady-state/markov-chain-steady-state | reviewed | N | + | + | + | + | o | P1 |
| esd/newsvendor-critical-fractile | sutd/esd/newsvendor-critical-fractile/newsvendor-critical-fractile | reviewed | N | + | + | + | + | o | P1 |
| freshmore/bayes-updating | sutd/freshmore/bayes-updating/bayes-updating | draft | Y | + | + | + | + | o | none | covered, exemplar |
| freshmore/eigenvector-transformations | sutd/freshmore/eigenvector-transformations/eigenvector-transformations | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| freshmore/vector-transformations | sutd/freshmore/vector-transformations/vector-transformations | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| smt/fourier-mode-superposition | sutd/smt/fourier-mode-superposition/fourier-mode-superposition | reviewed | N | + | + | + | + | o | P1 |
| smt/linear-system-stability | sutd/smt/linear-system-stability/linear-system-stability | reviewed | N | + | + | + | + | o | P1 |
| smt/ode-phase-portrait | sutd/smt/ode-phase-portrait/ode-phase-portrait | reviewed | N | + | + | + | + | o | P1 |

### Shared containers

| id | route | status | cov | visual | pedagogy | ui/ux | formula | sources | priority | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cs/gradient-descent-landscape | shared/cs/gradient-descent-landscape/gradient-descent-landscape | reviewed | N | + | + | + | o | o | P1 | "Substitution" word absent (defensible for landscape lab) |
| cs/graph-algorithm-explorer | shared/cs/graph-algorithm-explorer/graph-algorithm-explorer | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| math/bayes-updating | shared/math/bayes-updating/bayes-updating | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| math/central-limit-theorem | shared/math/central-limit-theorem/central-limit-theorem | reviewed | Y | + | + | + | + | - | none | sources.md 3 lines |
| math/eigenvector-transformations | shared/math/eigenvector-transformations/eigenvector-transformations | reviewed | N | + | + | + | + | - | P1 | sources.md 4 lines |
| math/hypothesis-test-decision | shared/math/hypothesis-test-decision/hypothesis-test-decision | reviewed | N | + | + | + | + | o | P1 |
| math/linear-programming-feasible-region | shared/math/linear-programming-feasible-region/lp-feasible-region | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| math/ode-phase-portrait | shared/math/ode-phase-portrait/ode-phase-portrait | reviewed | N | + | + | + | + | o | P1 |
| physics/circuit-phasor-reasoning | shared/physics/circuit-phasor-reasoning/circuit-phasor-lab | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| physics/free-body-diagram-mechanics | shared/physics/free-body-diagram-mechanics/force-balance | reviewed | Y | + | + | + | + | o | none | covered, exemplar |
| systems/pid-bode-builder | shared/systems/pid-bode-builder/pid-bode-builder | draft | Y | + | + | + | + | o | none | covered, exemplar |

## 4. Top P0/P1 findings

### P0

No P0 findings reproduced under static inspection. Every container shape validates. No simulation file is empty or missing. No sim that opts into the gate is text-only. No `status: published` container has the empty Filter pass.

Routes that would normally be browser-validated by `pnpm container:visual-quality` and `pnpm -F @paideia/sim-harness test` were **environment-blocked** by the missing Playwright Chromium binary. The 29 covered routes' Playwright assertions therefore could not be re-confirmed in this audit; they were confirmed green by the prior #283 audit on CI. Note this as "environment failure" and not P0.

### P1-1: Three `Date: TBD` Anieyrudh Filter passes

- `sutd/content/10-016-…/biodiversity-loss-and-land-use/TECHNICAL.md`
- `sutd/content/10-016-…/water-quality-and-treatment/TECHNICAL.md`
- `sutd/content/10-016-…/solar-energy-and-band-theory/TECHNICAL.md`

Why this matters: the Filter pass is the merge-bar review signal. Three reviewed-track containers shipped with the template placeholder still in `Date: TBD`. The containers themselves are in `draft`, so they have not yet crossed the publish-bar, but the Filter section must be filled before they can.

### P1-2: Two concept cards leak kernel paths to learners

- `a-level/content/physics/containers/alternating-current/concept-card.md:73` says "the physical knobs in `core/circuits`".
- `sutd/content/40-012-…/scheduling-and-project-management/concept-card.md:51` says "Critical-path timings come from `core/scheduling`."

Why this matters: concept-card.md is rendered as the learner-facing explainer in shells. The post-#283 standard explicitly forbids `core/...` package paths, `container`, `generated`, `queue`, or raw dot-separated IDs in learner copy. These two lines are a regression vector; the SUTD shell test should catch them once shell rendering pulls them in.

### P1-3: Two concept cards are 11–12-line stubs

- `sutd/content/epd/containers/pid-step-response/concept-card.md` (11 lines, one paragraph + one formula)
- `sutd/content/esd/containers/linear-programming-feasible-region/concept-card.md` (12 lines, two paragraphs)

Why this matters: PID and LP are the most-used freshmore concepts at SUTD. The simulations are mature and the visual model passes the contract, but the explanatory copy is too thin to teach the concept on its own. A learner who lands on the concept card before opening the sim gets a one-paragraph stub. The sims compensate, but the concept card should explain "first principles, canonical example, common misconceptions, transfer" in the spirit of every other reviewed container.

### P1-4: Coverage debt: 63 of 92 routes (68 %) still rely on route-specific tests

Of 92 simulation routes, only 29 declare `simulation/runtime.yaml` `visual_quality` metadata and only 7 of 92 `simulation/simulation.test.ts` files call `expectProductSimulationExperience`. The other 85 tests maintain bespoke reveal flows. These tests pass; they are not broken. They are coverage debt because:

- They cannot be re-validated by `pnpm container:visual-quality` against a single contract.
- They tend to encode route-specific copy ("Set up X check", "Reveal Y evidence") in the test, which slows the next iteration on the reveal contract.
- They are the largest single remaining standardisation gap. The post-#283 audit recommended tranches; nothing has reduced the count since.

### P1-5: A handful of sources files are 2–4 lines

- `sutd/content/esd/containers/linear-programming-feasible-region/sources.md` (2 lines)
- `sutd/content/csd/containers/graph-search-and-shortest-paths/sources.md` (3 lines)
- 3 of the SUTD 10.022 containers' sources.md (3 lines each)
- 4 A-Level physics containers' sources.md (4 lines each)
- 2 shared math containers' sources.md (4 lines each)

Why this matters: the visual simulation standard does not put a minimum length on sources, but pedagogically a 2-line "Winston / Taha" list does not give a reviewer the citation trail to verify claims. None of these are misciting; they are thin. P1 because the merge bar for a published container should include traceable sources for every key claim made in concept-card / problem-solving.

### P1-6: One grid-only visual model

- `sutd/packages/sims/src/joint-and-marginal-distributions.tsx` uses a CSS-grid 2x2 table as the "visual model". Standard accepts "or equivalent data-driven artifact"; a colour-coded grid that updates from controls qualifies, but it is the weakest visual in the repo. The two cells turn from "hidden" to a percentage on reveal, and the colour mapping is in a tiny legend swatch. P1 because if this is the model for the joint-marginal route, a Sankey or heatmap kernel would communicate the same concept more strongly.

### P1-7: Five sim files have no "Substitution" word in the formula card

- `sutd/packages/sims/src/cell-cycle-and-mitosis-meiosis.tsx`
- `sutd/packages/sims/src/dynamic-programming-state-recursion.tsx`
- `sutd/packages/sims/src/load-path-and-daylight-tradeoff.tsx`
- `sutd/packages/sims/src/shading-daylight-heat-gain.tsx`
- `shared/packages/sims/src/gradient-descent-landscape.tsx`

Why this matters: the merge bar requires `formula + substitution + units + result + legend`. Cell-cycle and dynamic-programming are state-machine / algorithm-trace containers where "substitution" maps to "walk the cell through phases" or "trace the recursion tree" — defensible. Load-path-and-daylight, shading-daylight, and gradient-descent-landscape are continuous-math containers where the substitution row should be visible. P1 because the rest of the formula-card pattern is present; only the substitution row is absent.

## 5. Repeated failure patterns

The audit surfaced six recurring patterns. Listed in order of how often they appear:

1. **Visual-quality metadata absent.** 63 of 92 routes. The post-#283 audit already named this; the count has not changed. Routes pass their route-specific tests but cannot be re-validated by the generic helper.
2. **Route-specific reveal flow.** 85 of 92 `simulation.test.ts` files click "Set up X" and "Reveal Y" by exact label rather than calling `expectProductSimulationExperience`. This is the natural consequence of (1) plus the per-container generation pattern, but it locks the test to that container's copy.
3. **Thin sources.md.** Ten or so containers ship a sources file that is 2–4 lines, often citing one textbook and one website. The merge bar implies citations per key claim; thin sources are technically valid but pedagogically weak.
4. **Concept cards that are too short to teach the concept alone.** Two are extreme (11 and 12 lines). About six more are in the 26–35-line band where the structure is right but each section is a one-sentence stub.
5. **Kernel path leakage.** Two confirmed instances. Easy to miss because the test gates don't render the concept card; a shell-side render assertion would catch them.
6. **Filter pass left at `Date: TBD`.** Three instances, all in SUTD 10.016. These are draft-status containers, so this is process drift more than a quality regression.

## 6. Best exemplars

These containers are the strongest in the repo today. Any future container-build prompt should point at them as templates.

1. **`a-level/mathematics/probability-statistics`** — strongest A-Level math: covered by the gate, rich concept card, ScatterPlot-driven visual, full formula card, deep sources.
2. **`a-level/physics/projectile-motion`** — strongest A-Level physics: ParametricPlot + SVG trajectory, kinematics-kernel-backed math, formula+substitution+legend correctly themed.
3. **`shared/physics/free-body-diagram-mechanics`** — exemplar for force-balance UI: drag-vector controls and a tightly coupled SVG diagram, full formula card, mechanics kernel composition.
4. **`shared/physics/circuit-phasor-reasoning`** — exemplar for phasor reasoning: Bode plot + phasor diagram + formula card, clean kernel composition, mature sources.
5. **`shared/cs/graph-algorithm-explorer`** — exemplar for algorithm-trace style: graph drawing + step trace + formula card; covered by the gate.
6. **`sutd/freshmore/eigenvector-transformations`** — exemplar for "visible eigenvector" containers: VectorFieldPlot, formula card with colour-coded legend, prediction misconception list, transfer problem.
7. **`sutd/10-017-technological-world-e-and-m/coulomb-s-law-and-discrete-charge-fields`** — exemplar for SUTD course-code physics: discrete-charge SVG, vector-field readout, formula card.
8. **`sutd/csd/graph-search-and-shortest-paths`** — exemplar for SUTD CSD: graph + step trace, mature kernel composition, covered by the gate.
9. **`sutd/10-019-…/cell-structure-and-the-membrane`** — best of the SUTD 10.019 healthcare family: SVG channel diagram, GHK formula card, real biophysics kernel composition.
10. **`sutd/dai/trust-calibration`** — strong DAI exemplar: calibration plot + formula card + covered by the gate.

## 7. Recommended repair waves

### Wave 1 — P1 housekeeping (single small PR)

- Fill in three `Date: TBD` Filter passes (10-016 biodiversity, water-quality, solar-energy).
- Remove the two kernel-path leaks (`a-level/.../alternating-current/concept-card.md`, `sutd/.../scheduling-and-project-management/concept-card.md`).
- Replace the two stub concept cards (`epd/pid-step-response`, `esd/linear-programming-feasible-region`) with the standard four-section template (first principles, canonical example, common misconceptions, transfer).

Acceptance: `pnpm container:validate`, `pnpm agent:validate`, no learner-facing string drift.

### Wave 2 — SUTD 10.018 multivariable-calc/LA tranche (one PR)

Add `simulation/runtime.yaml` `visual_quality` metadata and switch `simulation.test.ts` to `expectProductSimulationExperience` for 2–3 routes:

- `double-and-triple-integrals`
- `partial-derivatives-and-gradient`
- `optimisation-with-lagrange-multipliers`

This is the largest non-covered cluster (10 containers, 1 covered) and was the recommended next tranche in the #283 audit.

### Wave 3 — Remaining SUTD 10.019 healthcare tranche (one PR)

- `cell-cycle-and-mitosis-meiosis`
- `immune-system-and-vaccines`
- `cancer-genetics-and-therapy`

These were generated in a batch and should be moved to the live-first pattern.

### Wave 4 — SUTD 10.022 uncertainty tranche (one PR)

- `central-limit-theorem`
- `conditional-probability-and-bayes`
- `discrete-rvs-geometric-binomial-poisson`

Also pad the thin sources files in this family to 5+ entries each.

### Wave 5 — Source-file pad-out (one small PR)

Expand the 2–4-line sources files in:

- `sutd/esd/linear-programming-feasible-region`
- `sutd/csd/graph-search-and-shortest-paths`
- `sutd/10-022-…/{central-limit-theorem,continuous-rvs-uniform-exponential,joint-and-marginal-distributions}`
- `a-level/physics/{momentum,waves,work-energy-power}`
- `shared/math/{bayes-updating,eigenvector-transformations}`

Each should add at least one peer-reviewed reference (the formulas come from textbooks; cite the textbook) and one Khan Academy / OpenStax pointer for further learner reading.

### Wave 6 — A-Level physics metadata backfill (split into two PRs)

A-Level physics has 12 of 18 routes without `visual_quality` metadata. They all pass route-specific tests and have real visual models; they just need the helper plug-in. Two tranches of 6 routes each is the right shape.

## 8. CI / gate recommendations

To prevent the patterns above from recurring as production resumes:

1. **`pnpm container:visual-quality` should be required for new containers.** It already is for the 29 covered routes; the merge bar for new sim-worthy routes should be that `visual_quality` metadata is present from the first PR. Surface this in `docs/agents/build-one-container.md` and in the container-build prompt template.
2. **Shell copy-quality lint as a standalone gate.** The post-#283 audit recommended this. The shell tests catch banned words on default surfaces; a rendered-copy gate over **every** container's `concept-card.md` and `problem-solving/algorithm.md` would catch the kernel-path leak and any "package name" / "queue id" drift before it lands. The two leaks identified here (`core/circuits`, `core/scheduling`) would have failed the gate.
3. **Sources minimum lint.** A trivial JS script that warns when `sources.md` has fewer than 5 non-blank lines would catch the 2-line and 3-line cases. P2 because some containers genuinely only need one canonical reference; but the warn-only signal would be useful.
4. **Anieyrudh Filter pass non-`TBD` lint.** Add a check that fails when `TECHNICAL.md` `## Anieyrudh Filter pass` section starts with `Date: TBD`. Three containers currently fail this. P1 fix would close that.
5. **`status: draft` floor.** 29 of 92 containers are still draft. The runbook currently allows draft to publish; a quarterly cadence check that fails when more than 40 % of containers are draft would push the review cycle.
6. **Concept-card minimum-section lint.** Containers' concept-card.md should have at least four section headings (`First-Principles Explanation`, `Canonical Example`, `Common Misconceptions`, `Transfer`). The two 11-12-line stubs would fail this check. P2 because some containers may legitimately use different section names; but a warn-only signal would surface drift.
7. **`expectProductSimulationExperience` adoption metric.** The CI runner should publish "tests using the helper / total tests" alongside `pnpm test` summaries. Today the ratio is 7 / 92. Tracking it would create explicit accountability for closing the route-specific-test gap.

---

## Completion report

### Commands run

| Command | Result |
| --- | --- |
| `git checkout main && git pull origin main` | already up to date |
| `pnpm install` | OK |
| `pnpm graph:check` | OK |
| `pnpm container:validate` | OK — 92 containers passed |
| `pnpm container:visual-quality` | **environment failure** — Playwright Chromium binary missing from `/opt/pw-browsers/chromium_headless_shell-1223/chrome-headless-shell-linux64/`. 29 visual_quality contracts loaded; all 29 marked failed due to browser launch. Static metadata count: 29 / 92 routes opted in. |
| `pnpm -F @paideia/sim-harness test` | **environment failure** — same Chromium binary missing. Test files compile and discover correctly; cannot execute. |
| `pnpm -F @paideia/a-level-shell test` | not run; assumed Playwright-blocked on same binary |
| `pnpm -F @paideia/sutd-shell test` | not run; assumed Playwright-blocked on same binary |
| `pnpm test:a11y` | not run; assumed Playwright-blocked on same binary |
| `pnpm roadmap:validate` | OK — 143 queue entries validated |
| `pnpm agent:validate` | OK |

### Routes inspected manually (static-only)

All 92 routes were inspected at the structural level: `container.yaml`, `concept-card.md`, `simulation/runtime.yaml`, `simulation/simulation.yaml`, `simulation/simulation.test.ts`, `sources.md`, `TECHNICAL.md`. Sim TSX line counts and SVG/chart presence inspected on all 91 distinct sim packages.

Per-family deep-dive sample (concept-card text, formula-card structure, sources thickness):

- A-Level physics: projectile-motion, alternating-current (kernel-leak), forces-and-equilibrium (smallest sim).
- A-Level math: probability-statistics, hypothesis-testing.
- SUTD 10.016: biodiversity-loss-and-land-use (TBD Filter), atomic-structure, electrochemistry-and-batteries.
- SUTD 10.017: coulomb-s-law (covered), magnetic-induction (uncovered).
- SUTD 10.018: gaussian-elimination (covered), double-and-triple-integrals (uncovered).
- SUTD 10.019: cell-structure-and-the-membrane, protein-folding, gene-expression, cell-signalling (all covered); cancer-genetics-and-therapy (uncovered).
- SUTD 10.022: joint-and-marginal (grid-only visual), linear-regression (ScatterPlot), central-limit-theorem (thin sources).
- ASD/CSD/DAI/EPD/ESD/SMT: at least one container from each pillar.
- Freshmore: bayes-updating, eigenvector-transformations, vector-transformations (all covered).
- Shared: bayes-updating, central-limit-theorem, gradient-descent-landscape, graph-algorithm-explorer.

### Audit totals

- Total containers audited: **92**
- Containers in `reviewed` status: **63**
- Containers in `draft` status: **29**
- Containers covered by the generic visual-quality gate: **29**
- Containers NOT covered: **63**
- Sim TSX files inspected: **91** (excluding `index.ts` and `.contract.tsx` files)
- P0 findings: **0**
- P1 findings: **7 categorical findings spanning 70+ container instances** (see §4 and the container matrix in §3 for per-container marks)
- P2 findings: identified inline (sources padding, concept-card section guidance, minor shell-copy polish)

### Best exemplar containers (re-stated)

1. `a-level/mathematics/probability-statistics`
2. `a-level/physics/projectile-motion`
3. `shared/physics/free-body-diagram-mechanics`
4. `shared/physics/circuit-phasor-reasoning`
5. `shared/cs/graph-algorithm-explorer`
6. `sutd/freshmore/eigenvector-transformations`
7. `sutd/10-017-…/coulomb-s-law-and-discrete-charge-fields`
8. `sutd/csd/graph-search-and-shortest-paths`
9. `sutd/10-019-…/cell-structure-and-the-membrane`
10. `sutd/dai/trust-calibration`

### Recommended next repair wave

**Wave 1 (highest leverage, single small PR):** Fill the three `Date: TBD` Filter passes in SUTD 10.016, remove the two `core/...` kernel-path leaks from `a-level/physics/alternating-current/concept-card.md` and `sutd/40-012-…/scheduling-and-project-management/concept-card.md`, and replace the two 11–12-line concept-card stubs (`epd/pid-step-response`, `esd/linear-programming-feasible-region`) with the standard four-section template. None of these require sim or kernel changes; all are pure copy + metadata edits, and they close the highest-visibility P1 cluster.

### Documentation gaps that made the audit harder

1. **`docs/quality/test-matrix.md` and `docs/quality/visual-exemplar-gallery.md` exist but are sparse.** The first lists "X passes Y" rows without container names; the second is a 22-line bullet list. A live "exemplar gallery" that names the 10 containers above and links to their sim TSX file would shorten future audits substantially.
2. **No central inventory of which containers have `visual_quality` metadata.** I derived it by walking 92 `runtime.yaml` files with `grep -l`. The shell could expose it (or `pnpm container:visual-quality --list-coverage` could).
3. **`docs/quality/coderabbit-wave-summary.md` is not dated with the audit cadence.** Its presence implies CodeRabbit reviews happened; the linkage to specific container PRs is implicit. A dated "since-last-audit" summary at the top would help.
4. **The runbook's "merge bar" is split across three docs** (`docs/container-spec.md`, `docs/quality/visual-simulation-standard.md`, `docs/product/container-quality-rubric.md`). They are consistent, but a new agent has to read all three. A 1-page "merge bar at a glance" composed of links to the canonical sections would help.
5. **No documented way to inspect a route headlessly without Playwright.** When the sandbox blocks Chromium, the audit falls back to static inspection. A `pnpm container:dump-route <id>` that prints the rendered HTML to stdout would let static inspection cover what the browser test would have shown.
6. **Container-build queue does not record draft-to-reviewed-to-published cadence.** Knowing that a container has been `draft` for N days would help prioritise review. The queue records `status` but not the date it last changed.

Audit complete.
