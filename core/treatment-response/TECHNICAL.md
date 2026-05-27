# @paideia/treatment-response Technical Notes

## Public Interface Summary

Six branded numerics, four input record types, five constructors, and four
operations (`hillDoseResponse`, `effectiveIC50`, `doseAtResponse`,
`therapeuticIndex`).

All fallible operations return `KernelResult<T>`. No `any`. No silent
catches. No clinical recommendations.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `Dose`, `TherapeuticIndex` non-negative finite | Constructors enforce; every op re-validates. |
| `IC50`, `HillCoefficient` strictly positive finite | Constructors enforce; every op re-validates. |
| `ResponseFraction` in `[0, 1]` | Constructor + boundary re-validation. |
| `ResistanceFactor >= 1` | Constructor + boundary re-validation. |
| `hillDoseResponse(0) = 0` | Explicit early-return. |
| `hillDoseResponse(IC50) = 0.5` | Property test. |
| `hillDoseResponse → 1` as dose → ∞ | Unit test. |
| `doseAtResponse(R) = 0` is rejected | Explicit guard returns `precondition-violated`. |
| `doseAtResponse(R) = 1` is rejected | Explicit guard returns `out-of-domain`. |
| `hillDoseResponse(doseAtResponse(R)) = R` | Round-trip property test. |
| `effectiveIC50(IC50, RF) = IC50 · RF` | Closed-form check. |
| `therapeuticIndex` rejects zero `effectiveDose` | Explicit guard returns `out-of-domain`. |
| All results stay finite | Every operation passes the raw number through `ensureFinite`. |

## Algorithm

- `hillDoseResponse`: `R = d^n / (IC50^n + d^n)`.
- `effectiveIC50`: `IC50 · RF`.
- `doseAtResponse`: closed-form inverse `d = IC50 · (R / (1 − R))^(1/n)`.
- `therapeuticIndex`: `toxicDose / effectiveDose`.

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
- **Hill:** zero-dose anchor; half-max property at `dose = IC50`; saturation
  at large dose.
- **Effective IC50:** identity at `RF = 1`; literal `5 × 4 = 20`.
- **doseAtResponse:** rejection at 0 and 1; round-trip property
  (`hill(doseAtResponse(R)) = R`).
- **Therapeutic index:** literal `100 / 5 = 20`; rejection at zero
  `effectiveDose`.
- **Resistance scenario:** end-to-end check that a 4× resistance factor
  needs a 4× dose for the same response.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`. No `any`. No silent
  catches. No drug names. No patient-specific logic. No clinical
  recommendations. The contract explicitly forbids them.

### P1 issues

- The Hill formula is presented as the only dose-response shape. Real
  pharmacology sometimes uses Emax models with a baseline or a maximum
  inhibition < 100 %. Flagged as a P2.
- `doseAtResponse` rejects `R = 0` (trivial dose) and `R = 1` (infinite
  dose) rather than returning `0` and `Infinity`. The explicit errors are
  more pedagogically useful in a sim.

### P2 follow-ups (deferred)

- `emaxResponse({ dose, ic50, hillCoefficient, emax, e0 })` for sims that
  need bounded-from-below baseline responses.
- `synergyScore` (Bliss / Loewe) once a sim needs drug-combination
  reasoning.
- A `core/pharmacokinetics` kernel for time-course (one-compartment IV /
  oral) dose modelling. This kernel intentionally focuses on the
  steady-state dose-response layer.

### High-bandwidth questions surfaced

- Should `Dose` be a unit-typed brand (mg/kg, nM)? Today it is unitless and
  the caller picks the unit at its own boundary. Promotion to a per-unit
  brand would force every container to commit to a specific unit; today's
  curriculum benefits from unit-agnostic teaching.
- Should `ResistanceFactor` allow values < 1 (a hypersensitive clone)?
  Today it requires `>= 1` because the common pedagogical use is
  "resistant" clones; hypersensitivity could be a separate brand.
