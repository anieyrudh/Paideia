# @paideia/immunology Technical Notes

## Public Interface Summary

Six branded numerics/strings (`EpitopeSequence`, `AffinityScore`,
`ImmunityLevel`, `DoseAmount`, `DecayRate`, `ReproductionNumber`), three
input record types, six constructors, and five operations (`matchAffinity`,
`boosterResponse`, `waneImmunity`, `effectiveReproductionNumber`,
`herdImmunityThreshold`).

All fallible operations return `KernelResult<T>` from `@paideia/shared`. No
`any` in public APIs.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `EpitopeSequence` alphabet is fixed and length is `1..64` | `epitopeSequence` validates letter-by-letter against `EPITOPE_LETTERS` and the length cap. |
| `AffinityScore`, `ImmunityLevel` are in `[0, 1]` | Constructors enforce; every operation re-validates at the boundary. |
| `DoseAmount`, `DecayRate`, `ReproductionNumber` are non-negative finite | Constructors enforce; every operation re-validates. |
| `matchAffinity` requires equal-length inputs | Explicit guard returns `out-of-domain` on mismatch. |
| `matchAffinity` is symmetric | Property test confirms `matchAffinity(a, b) === matchAffinity(b, a)`. |
| `boosterResponse` interpolates from previous immunity monotonically | Property test confirms `next >= prev` for all valid inputs. |
| `boosterResponse` returns prev unchanged when dose is zero | Explicit early-return; unit test. |
| `boosterResponse` rejects zero `halfMaxDose` and non-positive `hillCoefficient` | Explicit guards. |
| `effectiveReproductionNumber` is non-negative even with floating-point noise | Final `Math.max(0, re)`. |
| `herdImmunityThreshold` requires `R_0 > 1` | Explicit guard returns `out-of-domain`. |
| Inverse relationship `R_e = 1` at `p = 1 − 1/R_0` | Property test asserts `effectiveReproductionNumber({ baseR0, herdImmunityThreshold(baseR0) }) ≈ 1`. |

## Algorithm

- `matchAffinity`: fraction-of-positions match; `O(L)`.
- `boosterResponse`: Hill-form bump combined with previous immunity via
  `next = 1 − (1 − prev) · (1 − boost)`. This guarantees `next ≥ prev` and
  `next ≤ 1`.
- `waneImmunity`: `I(t) = I · exp(−λ · t)`. Clamped to `[0, 1]`.
- `effectiveReproductionNumber`: `R_e = R_0 · (1 − p)`, clamped to `[0, ∞)`.
- `herdImmunityThreshold`: `p* = 1 − 1/R_0` for `R_0 > 1`.

## Dependencies and License Status

| Dependency | Kind | Version | License |
|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) |
| `fast-check` | dev | `^3.23.2` | MIT |
| `typescript` | dev | `^5.6.0` | Apache-2.0 |
| `vitest` | dev | `^4.1.7` | MIT |

No new third-party runtime dependencies.

## Test Strategy

- **Constructors:** every constructor's accept/reject paths.
- **Match:** identical, complement-disjoint, half-match, unequal-length
  rejection; symmetry property test.
- **Booster:** zero-dose identity; large-dose saturation; monotonicity
  property test; zero `halfMaxDose` and non-positive `hillCoefficient`
  rejection.
- **Waning:** identity at zero rate or zero days; half-life check; negative-
  days rejection.
- **R_e and threshold:** literal formula checks; full-immunity clamps to
  zero; `R_0 ≤ 1` rejection; round-trip property `R_e(threshold(R_0)) = 1`.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`. No `any`. No silent
  catches. No pathogen-specific parameter sets. No vaccine-type
  enumeration. Closed-form math only.

### P1 issues

- The booster combination rule `next = 1 − (1 − prev)·(1 − boost)` is one of
  several reasonable choices (alternative: `min(1, prev + boost)`). The
  multiplicative form preserves the bounded `[0, 1]` invariant under any
  sequence of boosters without an explicit clamp; documented.
- The `matchAffinity` epitope alphabet covers both nucleotide letters
  (ACGTU) and amino acids. Sims that compare only nucleotide sequences will
  see no functional difference, but a future agent could split into
  `nucleotideEpitope` / `proteinEpitope` if confusion arises.

### P2 follow-ups (deferred)

- Add `cooperativeBooster` for sims that model two-vaccine combinations.
- Add an `SirOneStep` helper that runs one forward-Euler step of `S → I → R`
  with the kernel's `R_0` and immunity inputs. Today the same effect is
  achievable by computing `R_e` here and feeding `core/dynamical-systems`.
- Promote `ImmunityLevel` and `AffinityScore` to a shared `UnitInterval`
  brand in `core/shared` if more kernels need it.

### High-bandwidth questions surfaced

- Should `EpitopeSequence` reuse `core/sequence` brands instead of defining
  a new alphabet? Today this kernel accepts both nucleotide and amino-acid
  letters because immunology epitopes can be either; `core/sequence` defines
  them as disjoint alphabets.
- Should `herdImmunityThreshold` return `null` instead of an error for
  `R_0 ≤ 1`? Today it returns `out-of-domain`; the error path is more
  explicit and tested.
