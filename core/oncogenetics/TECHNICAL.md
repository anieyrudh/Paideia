# @paideia/oncogenetics Technical Notes

## Public Interface Summary

Six branded numerics, four input record types and one output record, four
constructors, and four operations (`relativeFitness`, `multiHitProbability`,
`clonalGrowthAfterGenerations`, `compareClonalGrowth`).

All fallible operations return `KernelResult<T>`. No `any`. No silent
catches.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `MutationCount` is a non-negative integer | `mutationCount` enforces; every op re-validates. |
| `FitnessAdvantage`, `CellPopulationSize` non-negative finite | Constructors + boundary re-validation. |
| `MutationRatePerCellDivision` in `[0, 1]` | Constructor + boundary re-validation. |
| `RelativeFitness >= 1` | Computed as `(1 + s)^k` for `s ≥ 0`, `k ≥ 0`, then asserted; any floating-point edge that drops below 1 returns `numerical-instability`. |
| `multiHitProbability` in `[0, 1]` | Final `clamp01`; computed via `1 - exp(trials · log(1 - p))` for numerical stability at small `p`. |
| `multiHitProbability` requires `requiredDriverHits >= 1` | Explicit guard returns `precondition-violated`. |
| `compareClonalGrowth` requires positive reference size | Explicit guard returns `out-of-domain`. |
| `clonalGrowthAfterGenerations` cannot return a negative size | Final `Math.max(0, ...)` after the multiplicative growth. |

## Algorithm

- `relativeFitness`: `(1 + s)^k`, asserted `≥ 1`.
- `multiHitProbability`: per-cell per-generation chance of acquiring all `k`
  hits is approximated as `μ^k` (the simplest mass-action limit). Aggregated
  over `N · g` trials via `1 − (1 − μ^k)^(N·g)`, computed as
  `1 − exp(N·g · log(1 − μ^k))` to stay accurate at small `μ`.
- `clonalGrowthAfterGenerations`: `size · ((1 + s)^drivers)^generations`.
- `compareClonalGrowth`: composes the above and returns the ratio.

## Dependencies and License Status

| Dependency | Kind | Version | License |
|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) |
| `fast-check` | dev | `^3.23.2` | MIT |
| `typescript` | dev | `^5.6.0` | Apache-2.0 |
| `vitest` | dev | `^4.1.7` | MIT |

No new third-party runtime dependencies.

## Test Strategy

- **Constructors:** every constructor's accept/reject paths including
  integer-ness for `mutationCount`.
- **Relative fitness:** zero-driver identity; literal `(1.1)^3` check;
  monotonic-≥-1 property.
- **Multi-hit:** generations=0 and population=0 corner cases; saturation at
  high `N·g`; rejection of zero `requiredDriverHits`; numerical-stability
  property at tiny `μ`.
- **Clonal growth:** generations=0 identity; zero-driver / zero-advantage
  identity; multiplicative property `(1+s)^drivers · generations`.
- **Compare:** ratio > 1 for higher-driver clone; zero-reference rejection.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`. No `any`. No silent
  catches. No clinical recommendations. No oncogene / tumour-suppressor
  names. No stochastic noise.

### P1 issues

- The multi-hit approximation uses the simplest mass-action form (`μ^k` per
  cell per generation, independent trials). Real Knudson two-hit reasoning
  involves age-dependent incidence integrals; that level of detail is
  explicitly out of scope here and documented.
- `RelativeFitness >= 1` precludes deleterious passenger drag. A future P2
  could expose `RelativeFitnessWithDrag` accepting both advantageous and
  deleterious effects; today this kernel keeps the introductory clean.

### P2 follow-ups (deferred)

- `clonalCompositionAfterGenerations(clones, ...)` that tracks population
  fractions of multiple competing clones.
- `expectedAgeAtDiagnosis(populationSize, mutationRate, requiredHits)` once
  age-incidence integration is needed.
- Driver-mutation rate ratio `driverRate / passengerRate` for sims that
  highlight which mutations matter.
- Promote `CellPopulationSize` and `HitProbability` to a shared
  `UnitInterval` / `NonNegative` brand family in `core/shared`.

### High-bandwidth questions surfaced

- Should `multiHitProbability` accept a `selectionEnabled: boolean` flag for
  sims that want to contrast neutral vs selected accumulation? Today the
  formula is mass-action without selection; selection would multiply
  intermediate-hit clones by `(1 + s)^k` and change the answer materially.
  Flagged for an ADR if a container surfaces the need.
