# Equilibrium · Technical Record

## Public Interface Summary

`@paideia/equilibrium` exports branded concentration, equilibrium-constant, and
reaction-quotient values plus pure helpers for:

- `reactionQuotient`
- `compareReactionQuotient`
- `iceTable`
- `quotientFromIceTable`

The package owns `Q` versus `K` direction evidence and simple ICE-table
stoichiometric concentration updates. Broader chemistry behavior remains in
`@paideia/chemistry`.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Concentrations are finite and non-negative | `concentrationMolar` guard returns `out-of-domain` |
| Equilibrium constants are finite and positive | `equilibriumConstant` guard returns `out-of-domain` |
| Reaction quotient values are finite and non-negative | `reactionQuotientValue` guard returns `out-of-domain` |
| Quotient expressions have product and reactant terms | `reactionQuotient` returns `precondition-violated` |
| Species names are non-empty and unique | Term validators return `precondition-violated` |
| Coefficients are finite and positive | `positiveFinite` guard returns `out-of-domain` |
| Reactant denominator concentrations are positive | `reactionQuotient` returns `out-of-domain` |
| ICE extents cannot consume more reactant than available | `iceTable` returns `out-of-domain` |
| Overflow is not silently rendered | Helpers return `numerical-instability` |
| Caller-owned inputs are not mutated | Tests compare input snapshots and frozen outputs |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No data tables, symbolic solvers, rendering libraries, or GPL-family runtime
  dependencies are bundled.

## Test Strategy

- Happy paths cover reaction quotient exponent handling, `Q` versus `K`
  direction, ICE-table row construction, and quotient recovery from ICE rows.
- Error paths cover `out-of-domain`, `precondition-violated`, and
  `numerical-instability`.
- Property-style loops check monotone direction classification across `Q/K`
  ratios.
- Immutability checks confirm caller inputs are not mutated and row outputs are
  frozen.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could duplicate `@paideia/chemistry` or become a symbolic chemistry
  solver. Resolved by keeping this package to `Q`, `K`, direction evidence, and
  simple ICE-table concentration changes.
- Invalid concentrations or overflow could leak `NaN`, `Infinity`, or negative
  values into simulations. Resolved through `KernelResult.err` guards and
  depletion checks.

### P1 issues

- Product concentrations may be zero while reactant denominator concentrations
  cannot be zero. Resolved through separate product/reactant quotient guards.
- ICE tables can hide stoichiometric sign mistakes. Resolved by encoding side,
  coefficient, signed change, and final concentration in every row.

### High-bandwidth questions surfaced

- If a future container needs to solve equilibrium extent from a supplied `K`,
  that should be a separate bounded solver contract rather than hidden inside
  this one-step ICE helper.

## P2 Followups

- Add a bounded one-variable extent solver only when a container specifically
  needs to solve an ICE table from `K`.
- Add gas-pressure equilibrium expressions only through a separate contract if
  a queue item needs `Kp` or pressure quotients.
