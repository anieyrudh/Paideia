# Reaction Kinetics · Technical Record

## Public Interface Summary

`@paideia/reaction-kinetics` exports branded concentration, rate-constant, and
activation-energy values plus pure helpers for:

- `concentrationAtTime`
- `halfLife`
- `sampleConcentrationSeries`
- `arrheniusRateRatio`

The supported reaction orders are exactly `0`, `1`, and `2`.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Concentrations are finite and non-negative | `concentrationMolar` guard returns `out-of-domain` |
| Rate constants are finite and non-negative | `rateConstant` guard returns `out-of-domain` |
| Reaction order is `0`, `1`, or `2` | Runtime guard returns `precondition-violated` |
| Time values are finite and non-negative | Runtime seconds guard returns `out-of-domain` |
| Half-life needs positive concentration and rate constant | `halfLife` returns `precondition-violated` |
| Samples have at least two points and ordered bounds | `sampleConcentrationSeries` returns `precondition-violated` |
| Arrhenius temperatures are positive Kelvin | Runtime Kelvin guard returns `out-of-domain` |
| Overflow is not silently rendered | Helpers return `numerical-instability` |
| Caller-owned inputs are not mutated | Tests compare input snapshots and frozen outputs |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No chemistry data tables, external solvers, rendering libraries, or GPL-family
  runtime dependencies are bundled.

## Test Strategy

- Happy paths cover zero-order depletion, first-order decay, second-order decay,
  half-life formulas, bounded sampling, and Arrhenius temperature ratios.
- Error paths cover `out-of-domain`, `precondition-violated`, and
  `numerical-instability`.
- Property-style loops check monotone non-increasing concentration samples and
  that each half-life produces half the initial concentration.
- Immutability checks confirm caller inputs are not mutated and sample outputs
  are frozen.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could sprawl into a chemistry solver platform. Resolved by limiting the
  package to integrated rate laws, half-life, Arrhenius ratio, and bounded
  samples.
- Invalid kinetic parameters could leak `NaN`, `Infinity`, or negative
  concentrations into simulations. Resolved through `KernelResult.err` guards
  and zero-order depletion clipping.

### P1 issues

- Kinetics overlaps with `core/chemistry`. Resolved by keeping equilibrium,
  stoichiometry, pH, and Nernst behavior in `core/chemistry`; this package owns
  only kinetics formulas.
- Rate-constant units vary by reaction order. Resolved by documenting that
  `RateConstant` units are implied by `ReactionOrder` and keeping order explicit
  in every calculation input.

### High-bandwidth questions surfaced

- Should a future container need fitted rate constants from noisy data, that
  should be a separate statistics or fitting extension, not this kernel.

## P2 Followups

- Add optional linearized evidence points (`[A]`, `ln[A]`, or `1/[A]`) only when
  a container needs to teach how order is diagnosed from plots.
- Add reversible or consecutive reaction helpers only through a separate
  contract if a queue item specifically needs those mechanisms.
