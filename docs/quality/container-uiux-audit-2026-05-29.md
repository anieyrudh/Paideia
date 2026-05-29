# Paideia UI/UX Audit Delta

Date: 2026-05-29
Baseline: `main` after PR #275 (`test: enforce visual simulation reveal quality`)

## Executive summary

The immediate visual-simulation P0s from the previous audit are resolved on the enforceable path. The new `pnpm container:visual-quality` gate checks 8 formerly weak routes and all 8 now pass the product reveal contract: prediction is blocked before commit, observation unlocks after commit, a visible model is present, and formula/substitution/units/result/legend evidence is available.

The product is not ready for another large container-production wave yet. The remaining risk is coverage and consistency: only 8 of 92 registered simulation routes declare `simulation/runtime.yaml` `visual_quality` metadata. Many older routes have their own route-specific tests and visuals, but they are not yet covered by the generic product-quality contract. That is now a P1 standards-backfill problem rather than the previous P0 text-only-route problem.

## Checks rerun on main

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm container:quality` | pass | Static quality gate accepts the new helper requirement for metadata-backed routes. |
| `pnpm container:visual-quality` | pass | 8 metadata-backed routes passed. Local sandbox required elevated localhost binding. |
| `pnpm test:a11y` | pass | A-Level shell: 8 passed. SUTD shell: 1 passed. Serious and critical axe violations are blocked. |
| `pnpm -F @paideia/sutd-shell test` | pass | 7 passed, including search and no raw IDs on default SUTD screen. |
| `pnpm -F @paideia/a-level-shell test` | pass | 16 passed, including navigation, search, and representative revealed sims. |

## Route coverage

| Metric | Count |
| --- | ---: |
| Registered sim-harness routes | 92 |
| `simulation/simulation.test.ts` files | 92 |
| Routes with `visual_quality` metadata | 8 |
| Files calling `expectProductSimulationReveal` | 8 route tests plus the helper definition |
| Files calling `expectRevealedSimulationVisual` | 1 route test plus the helper definition |

## P0 findings

No current P0 was reproduced on the post-#275 audit path.

The 8 previously identified weak routes now pass the product reveal contract:

- `a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab`
- `sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths`
- `sutd/freshmore/vector-transformations/vector-transformations`
- `sutd/freshmore/eigenvector-transformations/eigenvector-transformations`
- `sutd/freshmore/bayes-updating/bayes-updating`
- `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems`
- `sutd/dai/trust-calibration/trust-calibration`
- `sutd/esd/linear-programming-feasible-region/linear-programming-feasible-region`

## P1 findings

### P1-1: Generic visual-quality metadata coverage is still low

Only 8 of 92 registered routes have `visual_quality` metadata. The next cleanup should not mass-edit all routes blindly, but every sim-worthy route should eventually be covered by `expectProductSimulationReveal` or an equivalent explicit helper. Without this, route-specific tests can pass while the global harness cannot verify stage progression, formula evidence, or visual evidence consistently.

### P1-2: Formula panels are not yet normalized repo-wide

The new standard requires "Formula used", "Substitution", "Units", "Result", and "Legend" unless `formula: "not-applicable"` has a reason. The 8 remediated routes comply. Older routes often have enough math evidence for a human, but labels vary (`Interpretation`, `Formula`, `Result`, route-specific language), which prevents generic checks from being reliable.

### P1-3: Some shell learner copy still uses internal wording

The SUTD shell default route is now tested against raw dot IDs and banned learner terms. A-Level still has code paths and some visible labels oriented around "containers" rather than "concepts" or "labs" (`x of y containers`, "Concept containers" aria label). This is not a broken route, but it weakens the public product feel.

### P1-4: The copy-quality lint is not yet a standalone repo gate

SUTD has a rendered shell regression test for the default screen. There is not yet a general `pnpm shell:copy-quality` or equivalent gate across shell routes and cards. This should be added after the next copy polish pass so it does not start life as a noisy lint.

## P2 findings

- `NO_COLOR` / `FORCE_COLOR` warnings appear in Playwright output. They are non-fatal noise.
- Local sandbox needs elevated localhost binding for Playwright web servers. CI is now configured correctly.
- `container:visual-quality` currently checks metadata-backed routes only. That is intentional, but the pass count should rise steadily as routes are backfilled.

## Don Norman assessment

Discoverability is improving. The SUTD shell now has search and student-facing cluster cards, and both shells expose global navigation. The main remaining discoverability gap is not route access; it is consistency of what students see after reveal.

Feedback is now enforceable for the remediated routes. They visibly change after prediction and show chart/SVG/model evidence. Older routes still rely on bespoke tests, so feedback quality is harder to compare across the product.

Mapping and constraints are strongest where controls sit near formulas, readouts, and legends. The next backfill should prioritize routes whose controls are not obviously tied to a visual state.

Consistency is the biggest remaining weakness. The repository now has the standard, helper, and exemplars, but most routes predate that standard.

## Repair waves

### Wave 1: Metadata and helper backfill for strongest existing sims

Goal: raise generic coverage without redesigning routes.

Start with routes that already have strong route-specific visual/formula tests:

- `sutd/epd/pid-step-response/pid-step-response`
- `shared/systems/pid-bode-builder/pid-bode-builder`
- `shared/cs/graph-algorithm-explorer/graph-algorithm-explorer`
- `shared/math/linear-programming-feasible-region/lp-feasible-region`
- `shared/math/bayes-updating/bayes-updating`
- `shared/math/central-limit-theorem/clt-sampler`
- `shared/physics/free-body-diagram-mechanics/force-balance`
- `shared/physics/circuit-phasor-reasoning/circuit-phasor-lab`

Acceptance: add `visual_quality`, switch or add tests using `expectProductSimulationReveal`, and keep `pnpm container:visual-quality` green.

### Wave 2: A-Level shell and copy polish

Goal: remove learner-facing "container" terminology and add a rendered copy-quality test.

Targets:

- Replace visible "containers" labels with "concepts", "labs", or "modules".
- Keep internal variable names unchanged unless they leak into UI.
- Add rendered tests for banned terms on the default A-Level shell screen.

Acceptance: `pnpm -F @paideia/a-level-shell test`, `pnpm test:a11y`, and the new copy test pass.

### Wave 3: P1 formula/stage normalization for A-Level physics and mathematics

Goal: bring high-traffic A-Level routes under the product reveal contract.

Suggested order:

- `a-level/physics/scalars-and-vectors/resultant-magnitude`
- `a-level/physics/resolving-vectors/component-resolution`
- `a-level/physics/projectile-motion/trajectory-parameter-lab`
- `a-level/physics/kinematics-in-one-dimension/motion-equations-lab`
- `a-level/mathematics/probability-statistics/probability-statistics-lab`
- `a-level/mathematics/normal-distribution/normal-area-standardisation-lab`

Acceptance: each route declares explicit setup/prediction/reveal metadata and passes the generic product reveal contract.

### Wave 4: SUTD 10.xxx standards backfill

Goal: add metadata and formula normalization to the generated SUTD course-code slices.

Suggested order:

- 10.016 sustainability/science routes
- 10.017 E&M routes
- 10.018 calculus/linear-algebra routes
- 10.019 healthcare routes
- 10.022 uncertainty routes

Acceptance: 2-3 routes per PR, `pnpm container:visual-quality` count increases, no broad UI rewrite unless a route fails the generic contract.

### Wave 5: Resume container production

Resume new containers only after Waves 1-2 land. At that point, the build prompt should require `visual_quality` metadata from the start, so new containers do not add audit debt.

## Recommendation

Do not build another 40-container wave yet. Merge one small PR for Wave 1 first, then one A-Level copy-polish PR. After those two land, the standards are stable enough for container production to resume with the new gate active.
