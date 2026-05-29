# Paideia Container UI/UX Audit - 2026-05-29

This audit checked the current learner-facing Paideia application after the large
container and kernel waves. It combines existing Playwright gates, a custom
route sweep over generated registry data, and representative screenshot review.

## Executive Summary

Paideia is now structurally healthy: generated routes load, the A-Level and SUTD
shells are navigable, container validation passes for all reviewed containers,
and the tested accessibility baselines pass. This is not a blank or broken
prototype.

The main product risk is quality variance. The best slices, such as the A-Level
vector lab and the repaired SUTD PID step response, feel like real interactive
learning surfaces: they expose a model, controls, visible feedback, formulae,
substitutions, units, and a usable legend. The weak slices still feel generated:
large blank setup screens, plain text reveal states, no diagram after reveal, or
route-specific stages that an automated harness cannot understand without
custom instructions.

The clearest next move is not more container volume. It is to harden the visual
simulation contract and retrofit weak routes so every revealed sim has an
obvious visual model and a predictable accessibility structure.

## Audit Method

Baseline commands:

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm graph:check` | Pass | Generated graph files were fresh. |
| `pnpm container:validate` | Pass | `92 container(s) passed.` |
| `pnpm -F @paideia/sim-harness test` | Pass | `285 passed`. Required escalation because sandboxed localhost binding failed with `listen EPERM`. |
| `pnpm -F @paideia/a-level-shell test` | Pass | `16 passed`. Required escalation for local server binding. |
| `pnpm -F @paideia/sutd-shell test` | Pass | `5 passed`. Required escalation for local server binding. |
| `pnpm test:a11y` | Pass | A-Level shell `8 passed`; SUTD shell `1 passed`. |

Local audit servers:

| App | URL |
| --- | --- |
| Sim harness | `http://127.0.0.1:4183/` |
| A-Level shell | `http://127.0.0.1:4184/` |
| SUTD shell | `http://127.0.0.1:4185/` |

Custom route sweep:

- Source: `testing/sim-harness/src/generated/sim-registry.tsx`,
  `a-level/apps/shell/src/generated/knowledge-graph.tsx`, and
  `sutd/apps/shell/src/generated/knowledge-graph.tsx`.
- Coverage: 92 sim routes, 22 A-Level shell routes, 59 SUTD shell routes.
- Evidence artifact: `/private/tmp/paideia-uiux-audit/results.json`.
- Screenshots were intentionally kept outside git to avoid bloating the repo:
  `/private/tmp/paideia-uiux-audit/screenshots/` and
  `/private/tmp/paideia-uiux-audit/manual-samples/`.

Computer Use status: I attempted to inspect Chrome through the Computer Use MCP,
but macOS Accessibility/Screen Recording permission remained pending after three
`get_app_state` attempts. Manual review therefore used Playwright-driven local
browser screenshots instead of direct desktop control.

## Route Matrix Summary

| Surface | Routes checked | Pass | Warning | Needs attention |
| --- | ---: | ---: | ---: | ---: |
| Sim harness | 92 | 42 | 10 | 40 |
| A-Level shell | 22 | 21 | 1 | 0 |
| SUTD shell | 59 | 56 | 3 | 0 |
| Total | 173 | 119 | 14 | 40 |

Important interpretation: the 40 sim-route failures are not all product P0s.
Many are generic-audit failures where the direct sim route needs route-specific
stage steps before the prediction form appears. Existing Playwright contract
tests still passed. The durable finding is that the sim stage contract is not
standardized enough for a reusable visual-quality gate to operate reliably.

## Needs Attention

These routes failed the generic audit after setup-stage progression. The exact
failure text is in `/private/tmp/paideia-uiux-audit/results.json`.

| Severity | Route | Finding |
| --- | --- | --- |
| P1 | `a-level/physics/capacitance/capacitor-charge-energy-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `a-level/physics/electric-fields/charge-field-vector-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `a-level/physics/magnetic-fields/magnetic-force-direction-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab` | Revealed state did not expose a detectable visual artifact. |
| P0 | `shared/math/eigenvector-transformations/eigenvector-transformations` | Revealed state was text-only in the direct harness screenshot. |
| P1 | `shared/math/ode-phase-portrait/ode-phase-portrait` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-017-technological-world-e-and-m/capacitor-with-dielectric/capacitor-with-dielectric` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-017-technological-world-e-and-m/coulomb-s-law-and-discrete-charge-fields/coulomb-field-vector-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-017-technological-world-e-and-m/magnetic-induction-faraday-lenz/magnetic-induction-faraday-lenz` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-017-technological-world-e-and-m/maxwell-equations-and-em-waves/maxwell-equations-and-em-waves` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-017-technological-world-e-and-m/rlc-circuit-and-resonance/rlc-circuit-and-resonance` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/double-and-triple-integrals/double-and-triple-integrals` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems` | Revealed state did not expose a detectable visual artifact. |
| P1 | `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/optimisation-with-lagrange-multipliers/optimisation-with-lagrange-multipliers` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/partial-derivatives-and-gradient/partial-derivatives-and-gradient` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-022-modelling-uncertainty/continuous-rvs-uniform-exponential/continuous-density-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-022-modelling-uncertainty/discrete-rvs-geometric-binomial-poisson/probability-model-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-022-modelling-uncertainty/joint-and-marginal-distributions/joint-table-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/10-022-modelling-uncertainty/linear-regression/linear-regression` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/40-012-manufacturing-and-service-operations-mso/scheduling-and-project-management/schedule-critical-path-lab` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/asd/load-path-and-daylight-tradeoff/load-path-and-daylight-tradeoff` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/asd/shading-daylight-heat-gain/shading-daylight-heat-gain` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/asd/structural-load-path-diagram/structural-load-path-diagram` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/csd/dynamic-programming-state-recursion/dynamic-programming-state-recursion` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths` | Revealed state was text-only: traversal order, path cost, and formula text with no graph diagram. |
| P1 | `sutd/csd/recursion-tree-complexity/recursion-tree-complexity` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/dai/confusion-matrix-thresholds/confusion-matrix-thresholds` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/dai/fairness-threshold-audit/fairness-threshold-audit` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `sutd/dai/trust-calibration/trust-calibration` | Revealed state did not expose a detectable visual artifact. |
| P1 | `sutd/epd/bode-stability-margin/bode-stability-margin` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/epd/signal-filter-frequency-response/signal-filter-frequency-response` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `sutd/esd/linear-programming-feasible-region/linear-programming-feasible-region` | Revealed state did not expose a detectable visual artifact. |
| P1 | `sutd/esd/markov-chain-steady-state/markov-chain-steady-state` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/esd/newsvendor-critical-fractile/newsvendor-critical-fractile` | Generic harness could not reach a visible `Prediction gate` form. |
| P0 | `sutd/freshmore/bayes-updating/bayes-updating` | Revealed state did not expose a detectable visual artifact. |
| P0 | `sutd/freshmore/eigenvector-transformations/eigenvector-transformations` | Revealed state was text-only in the direct harness screenshot. |
| P0 | `sutd/freshmore/vector-transformations/vector-transformations` | Revealed state was text-only in the direct harness screenshot. |
| P1 | `sutd/smt/fourier-mode-superposition/fourier-mode-superposition` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/smt/linear-system-stability/linear-system-stability` | Generic harness could not reach a visible `Prediction gate` form. |
| P1 | `sutd/smt/ode-phase-portrait/ode-phase-portrait` | Generic harness could not reach a visible `Prediction gate` form. |

## Warnings

| Severity | Route | Finding |
| --- | --- | --- |
| P1 | `a-level/physics/forces-and-equilibrium/force-balance` | Formula/substitution/units language not detected by generic audit. |
| P1 | `a-level/physics/kinematics-in-one-dimension/motion-equations-lab` | Formula/substitution/units language not detected by generic audit. |
| P1 | `a-level/physics/projectile-motion/trajectory-parameter-lab` | Formula/substitution/units language not detected by generic audit, although manual screenshot shows formula text. |
| P1 | `a-level/physics/resolving-vectors/component-resolution` | Formula/substitution/units language not detected by generic audit. |
| P1 | `shared/cs/graph-algorithm-explorer/graph-algorithm-explorer` | Formula/substitution/units language not detected by generic audit. |
| P1 | `shared/math/central-limit-theorem/clt-sampler` | Formula/substitution/units language not detected by generic audit. |
| P1 | `shared/physics/circuit-phasor-reasoning/circuit-phasor-lab` | Formula/substitution/units language not detected by generic audit. |
| P1 | `shared/physics/free-body-diagram-mechanics/force-balance` | Formula/substitution/units language not detected by generic audit. |
| P1 | `sutd/10-022-modelling-uncertainty/central-limit-theorem/clt-sampler` | Formula/substitution/units language not detected by generic audit. |
| P1 | `sutd/10-023-designing-energy-systems/heat-transfer-modes/heat-flow-comparison-lab` | Formula/substitution/units language not detected by generic audit. |
| P2 | `a-level/physics/work-energy-power` | Shell route title match was not obvious to the generic detector. |
| P2 | `sutd/10-017-technological-world-e-and-m/coulomb-s-law-and-discrete-charge-fields` | Shell route title match was not obvious to the generic detector. |
| P2 | `sutd/asd/shading-daylight-heat-gain` | Shell route title match was not obvious to the generic detector. |
| P1 | `sutd/esd/markov-chain-steady-state` | Learner-facing internal language was detected once. |

## Representative Manual Review

### A-Level Shell

Screenshot: `/private/tmp/paideia-uiux-audit/manual-samples/a-level-shell-root.png`.

The A-Level shell is the stronger product surface. It has a clear side
navigation, search, module chips, mastery map, tabs, and a direct concept card
plus sim surface. It is dense, but the density is useful rather than chaotic.
The main weakness is vertical length: on a first visit, the learner sees a lot
of content before the active sim is visually dominant. This is a P2 polish issue,
not a structural failure.

### SUTD Shell

Screenshot: `/private/tmp/paideia-uiux-audit/manual-samples/sutd-shell-root.png`.

The SUTD shell is usable and routes load, but it feels more like an internal
build map than a polished learner dashboard. The Freshmore card exposes raw IDs
such as `shared.physics.free-body-diagram-mechanics`. That breaks Don Norman's
principle of a coherent conceptual model: students should see concepts and
relationships, not implementation identifiers. The shell needs search, clearer
course/module navigation, and student-facing titles in cluster cards.

### PID Step Response

Screenshots:

- Setup: `/private/tmp/paideia-uiux-audit/manual-samples/sim-pid.png`
- Revealed: `/private/tmp/paideia-uiux-audit/manual-samples/sim-pid-revealed.png`

The revealed PID state is now product-quality: feedback loop diagram, step
response plot, readout cards, formula panel, substitutions, units, and legend
are visible. This directly addresses the original complaint that PID had no
observation graph. The setup stage is still too sparse: a single button or a row
of sliders sits above a large blank canvas. The direct sim harness should either
frame setup states better or be clearly treated as a testing harness rather than
the student product surface.

### Vector Labs

Screenshot: `/private/tmp/paideia-uiux-audit/screenshots/sim-a-level-physics-scalars-and-vectors-resultant-magnitude-desktop.png`.

The A-Level vector lab is a strong exemplar: visible vector geometry, readout
cards, formula block, substitution, units, and colour-coded legend all reinforce
one conceptual model. This is the style future sim-worthy containers should
target.

### Weak Text-Only Reveals

Screenshots:

- `/private/tmp/paideia-uiux-audit/screenshots/sim-sutd-csd-graph-search-and-shortest-paths-graph-search-and-shortest-paths-desktop.png`
- `/private/tmp/paideia-uiux-audit/screenshots/sim-sutd-freshmore-vector-transformations-vector-transformations-desktop.png`

These are the clearest examples of low-effort output. The graph-search route
reveals traversal order and path cost as plain text, with no graph drawing,
highlighted frontier, selected path, or edge weights. The vector-transformation
route reveals matrix facts as text with no grid or transformed vector plane.
These should be treated as P0 under the visual-simulation standard.

## Don Norman Assessment

| Principle | Assessment |
| --- | --- |
| Discoverability | A-Level is good; SUTD is acceptable but too implementation-facing; direct sim routes often begin with sparse setup screens. |
| Feedback | Strong in polished sims like vectors and PID; weak in text-only routes where learners cannot see what changed. |
| Mapping | Formula legends and colour-coded visuals work well when present. Raw IDs and abstract text-only evidence weaken mapping. |
| Constraints | Prediction gates are conceptually strong, but route-specific stage flows make generic testing difficult. |
| Consistency | The repo has a consistent PMOE-T skeleton, but visual quality ranges from polished to plain generated text. |
| Error prevention and recovery | Reset buttons and prediction commits are present in many sims; generic route-level recovery is under-specified. |
| Conceptual model | Best routes tie controls, formula, and visual model together. Weak routes expose results without a model. |

## Findings

### P0

- Text-only revealed states remain in sim-worthy containers. The clearest
  examples are graph search, Freshmore vector transformations, Freshmore
  eigenvector transformations, Bayes updating, and several optimization/system
  routes flagged above.
- Only the PID test currently imports `expectRevealedSimulationVisual`. There
  are 92 `simulation.test.ts` files, but the reusable visual helper is used in
  only one container family. This means the visual standard exists but is not
  enforced repo-wide.

### P1

- Many direct sim routes require custom setup-stage interactions before a
  prediction form appears. The route-specific tests know those steps; a reusable
  harness does not. This prevents scalable UI-quality enforcement.
- Formula/substitution/unit detection is not reliable across all routes. Some
  routes have good formula panels but outside the generic observation region;
  others genuinely lack the formula structure.
- The SUTD shell exposes internal IDs and feels like a build map, not a student
  navigation surface.
- Several direct sim setup screens look empty or robotic before the learner
  clicks through the first stage.

### P2

- The A-Level shell is polished but vertically dense.
- SUTD needs search and module-level navigation comparable to A-Level.
- Visual style is too homogeneous across many generated sims. The shared
  skeleton is useful, but future slices need domain-specific diagrams, richer
  chart affordances, and better first-screen framing.
- The a11y gate is inconsistent: some tests check only critical violations,
  while newer tests check serious and critical.

## Remediation Backlog

1. Enforce the revealed visual contract repo-wide. Every non-legacy
   `simulation.test.ts` should call `expectRevealedSimulationVisual` or an
   equivalent route-specific helper.
2. Standardize sim stage metadata. The harness should know how to move from
   setup to prediction to reveal without brittle button-name guessing.
3. Move all visuals, formula panels, readouts, and legends inside or under a
   consistent `Observation unlocked` region so generic tests can verify them.
4. Backfill the P0 text-only routes with actual visual models:
   graph diagrams for graph search, vector planes for transformations,
   state/transition diagrams for Bayes and Markov routes, and feasible-region
   plots for optimization routes.
5. Upgrade the SUTD shell to a learner browser: search, course filters,
   human-readable cluster cards, and no raw package or queue IDs.
6. Add `pnpm container:visual-quality` as a CI gate. It should load every sim,
   reveal it, require a visible `svg`/`canvas`/`role=img`, require a formula or
   explicit no-formula exemption, and capture a failure screenshot.
7. Strengthen `pnpm test:a11y` so all shell and representative sim tests fail
   on serious or critical axe violations, not critical only.
8. Add a copy-quality lint for learner UI that rejects words like `container`,
   `generated`, `queue`, and raw dot-separated IDs in rendered shell cards.
9. Create a visual exemplar gallery in docs: vector geometry, response chart,
   graph traversal, probability distribution, biological pathway, and systems
   feedback loop.

## CI Gate Candidates

| Gate | Why |
| --- | --- |
| `container:visual-quality` | Catches text-only revealed states before review. |
| Stage contract checker | Makes setup/predict/reveal automation reliable. |
| Formula panel checker | Enforces formula, substitution, units, result, and legend where applicable. |
| Learner-copy lint | Prevents internal IDs and implementation language in product UI. |
| Screenshot diff smoke | Catches blank setup screens, overflow, and visual regressions. |
| Axe serious+critical standard | Normalizes accessibility expectations across shells and sims. |

## Conclusion

The repository has crossed from infrastructure-only into real product territory,
but it is not yet consistently product-grade. The best slices prove the model:
predict first, manipulate, reveal a visual system, connect formula to the model,
and transfer the idea. The weaker slices show the cost of scaling too quickly:
they pass structural checks but do not yet deliver a meaningful visual
experience.

Before another large container wave, the visual-quality gate should land and
the P0 text-only routes should be fixed.
