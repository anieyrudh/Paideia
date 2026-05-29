# Paideia UI/UX Audit Delta - Post #280 Refresh

Date: 2026-05-29
Baseline: `main` at `8db31fa`, after #273 and the visual-quality backfill PRs #277-#280.

## Executive summary

The enforced learner-facing path is healthier than the previous audit snapshot. #277-#280 landed the strongest-sim metadata backfill, A-Level copy polish, A-Level formula/stage normalization, and the first SUTD 10.017 metadata tranche. The generic visual-quality gate now checks 25 routes, and all 25 pass the product reveal contract.

No current P0 was reproduced on the audited path. `container:visual-quality`, the sim harness, shell tests, and a11y checks all pass on current `main`.

The remaining risk is standards coverage, not a known broken route. There are 92 registered simulation routes and 25 have `simulation/runtime.yaml` `visual_quality` metadata. The next work should raise coverage in small tranches, especially SUTD 10.018 and 10.019 routes that already have useful simulations but are not yet verified by the generic product reveal helper.

## Checks rerun on current main

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm graph:check` | pass | Generated graph files are fresh. |
| `pnpm container:validate` | pass | 92 containers passed. |
| `pnpm container:visual-quality` | pass | 25 routes checked, 25 passed. |
| `pnpm -F @paideia/sim-harness test` | pass | 335 tests passed. |
| `pnpm -F @paideia/a-level-shell test` | pass | 17 tests passed. |
| `pnpm -F @paideia/sutd-shell test` | pass | 7 tests passed. |
| `pnpm test:a11y` | pass | A-Level shell: 8 tests passed. SUTD shell: 1 test passed. |
| `pnpm roadmap:validate` | pass | 143 queue entries validated after #273. |
| `pnpm agent:validate` | pass | Agent docs validated after #273. |

## Browser spot-checks

Representative browser inspection was limited to shells and weak-route candidates because the automated harness now covers the full registered route set.

| Surface | Result | Notes |
| --- | --- | --- |
| A-Level shell | pass | Shows `All curricula`, search, and student-facing concept language. No learner-facing `container`, `generated`, `queue`, or raw dot-separated IDs were visible on the default screen. |
| SUTD shell | pass | Shows `All curricula`, search, course filters, and student-facing cluster cards. No learner-facing raw package/queue IDs were visible on the default screen. |
| SUTD Gauss route | pass | Sim harness route loads with a prediction surface and no raw internal IDs in the initial learner-facing text. |
| SUTD double/triple integrals route | pass with warning | Route loads with a prediction surface and student-facing title. It remains a good candidate for the next `visual_quality` metadata/helper backfill tranche. |

Screenshots were not committed because no new visual failure evidence needed to be preserved in git.

## Route coverage

| Metric | Count |
| --- | ---: |
| Registered sim-harness routes | 92 |
| `simulation/runtime.yaml` files | 92 |
| Routes with `visual_quality` metadata | 25 |
| Routes still relying on route-specific tests only | 67 |

## Completed remediation since the prior report

| Work | Status | Impact |
| --- | --- | --- |
| Strongest existing sims metadata/helper backfill | done | Raised generic reveal coverage for known-strong SUTD/shared routes. |
| A-Level shell copy polish | done | Removed learner-facing `container` language from the default shell surface. |
| A-Level formula/stage normalization | done | Brought high-traffic A-Level routes under the product reveal contract. |
| SUTD 10.017 first tranche | done | Added metadata/helper coverage for Coulomb, Gauss-law, and RLC routes. |

## Current P0 findings

No current P0 was reproduced by the post-#280 gates.

Important caveat: the 67 routes without `visual_quality` metadata are not automatically proven to satisfy the generic product reveal contract. They are not being marked P0 solely for missing metadata because their route-specific tests and container validations still pass. Treat them as P1 audit coverage debt until each route is checked by the generic helper.

## Current P1 findings

### P1-1: Generic visual-quality metadata coverage is incomplete

Only 25 of 92 registered simulation routes declare `visual_quality` metadata. The standard is now clear, but coverage is partial. New containers should include `visual_quality` from the start, and older routes should be backfilled in 2-3 route PRs.

### P1-2: SUTD 10.xxx route normalization is still uneven

The first 10.017 tranche is covered, but many 10.018, 10.019, 10.022, and later course-code routes still need explicit setup/prediction/reveal metadata and generic tests. These routes are the highest-value next target because they were built in large generated waves and share similar structure.

### P1-3: Formula labels still vary outside the covered routes

Covered routes must show formula, substitution, units, result, and legend unless they declare a justified `formula: "not-applicable"` exemption. Older routes often contain the right evidence for a human reader, but labels vary enough that generic tests cannot reliably verify them.

### P1-4: Copy-quality lint is still not a standalone repo gate

The shell tests now catch banned learner-facing words on representative default surfaces. A broader rendered-copy lint would prevent regressions in shell cards, route lists, and future curriculum browsers, but it should be added after another tranche of shell polish so it does not start as a noisy gate.

## P2 findings

- `NO_COLOR` / `FORCE_COLOR` warnings can still appear in Playwright output. They are noisy but non-fatal.
- Local browser checks may require elevated localhost binding in sandboxed Codex environments. CI remains the authoritative browser environment.
- The sim harness is a test surface, not the final learner shell. It is acceptable that harness pages are more direct than curriculum shell pages, but they should still avoid raw internal IDs where a route renders learner copy.

## Don Norman UI/UX assessment

Discoverability is materially better. Both shells expose global navigation, search, and student-facing labels. The SUTD shell now behaves more like a learner browser than a raw registry.

Feedback is strongest on the 25 metadata-backed routes. The learner predicts first, commits, then sees an observation region with a visible model and formula/readout evidence. This is the right conceptual model.

Mapping is improving but still uneven. Routes with nearby controls, formula cards, legends, and chart/SVG changes feel coherent. Routes outside the generic gate need the same stage and formula structure so students can predict cause and effect without reading code-like labels.

Constraints are now enforceable for covered routes. The gate blocks text-only reveals and missing formula evidence. The remaining issue is extending those constraints without mass-editing the repo blindly.

Consistency is the largest remaining product weakness. The product now has a standard, helpers, and exemplars, but most routes predate the standard. Small backfill waves should close this.

## Next remediation backlog

### 1. SUTD 10.018 metadata/helper tranche

Recommended next PR, 2-3 routes:

- `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/double-and-triple-integrals/double-and-triple-integrals`
- `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/partial-derivatives-and-gradient/partial-derivatives-and-gradient`
- `sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/optimisation-with-lagrange-multipliers/optimisation-with-lagrange-multipliers`

Acceptance: add `visual_quality`, use `expectProductSimulationReveal`, normalize formula labels if needed, and keep `pnpm container:visual-quality` green.

### 2. SUTD 10.019 healthcare tranche

Recommended follow-up PR, 2-3 routes:

- `sutd/10-019-science-and-technology-for-healthcare/cell-structure-and-the-membrane/cell-structure-and-the-membrane`
- `sutd/10-019-science-and-technology-for-healthcare/protein-folding-and-function/protein-folding-and-function`
- `sutd/10-019-science-and-technology-for-healthcare/gene-expression-dna-to-rna-to-protein/gene-expression-dna-to-rna-to-protein`

These are likely strong visually, but they were generated in a batch and should be made visible to the generic gate.

### 3. SUTD 10.022 uncertainty tranche

Recommended follow-up PR:

- `sutd/10-022-modelling-uncertainty/conditional-probability-and-bayes/conditional-probability-and-bayes`
- `sutd/10-022-modelling-uncertainty/central-limit-theorem/central-limit-theorem`
- `sutd/10-022-modelling-uncertainty/discrete-rvs-geometric-binomial-poisson/discrete-rvs-geometric-binomial-poisson`

This tranche should also verify that probability formulas expose substitution, units or dimensionless notes, result, and legend.

### 4. Shell copy-quality gate

Add a rendered-copy gate after the next shell polish pass. It should reject learner-facing `container`, `generated`, `queue`, and raw dot-separated route IDs in shell cards and default screens.

### 5. New container production

Resume broad container production only with this rule in the build prompt: every new sim-worthy route must ship `simulation/runtime.yaml` `visual_quality` metadata and a test using `expectProductSimulationReveal` from the first PR.

## Recommendation

Proceed with the SUTD 10.018 tranche next. It is small, high-value, and directly exercises the post-#280 standard on generated course-code routes without starting another large production wave.
