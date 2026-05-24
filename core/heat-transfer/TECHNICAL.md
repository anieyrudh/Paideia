# @paideia/heat-transfer Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: unit brands,
constants, input/result types, and pure kernel functions for conduction,
convection, radiation, series thermal resistance, U-value, solar heat gain, and
net heat balance.

## Numerical model

The kernel uses steady-state scalar formulae:

```text
q_cond = k A DeltaT / L
q_conv = h A DeltaT
q_rad = epsilon sigma A (T_hot^4 - T_cold^4)
R_layer = L / k
U = 1 / sum(R)
q_solar = A I SHGC exposure (1 - shaded fraction)
```

Public values are SI: watts, metres, square metres, kelvins, watts per metre
kelvin, watts per square metre kelvin, watts per square metre, and square metre
kelvins per watt. Dimensionless bounded quantities use branded `[0, 1]` types.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Areas, conductivities, coefficients, irradiance, and resistances are finite non-negative values | `nonNegative` guards |
| Denominator values are finite positive values | `positive` guards on thickness, conductivity when computing resistance, and total resistance |
| Emissivity, SHGC, and shaded fraction are in `[0, 1]` | branded constructors return `out-of-domain` |
| Radiation temperatures are non-negative kelvin values | `radiationHeatRate` guards |
| Layer arrays are not mutated | `seriesThermalResistance` reads inputs and returns a frozen result array |
| Empty layer/resistance inputs are rejected | `seriesThermalResistance` and `uValue` return `precondition-violated` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers conduction, convection, radiation, resistance, U-value,
solar heat gain, heat balance, invalid fractions, invalid denominators,
overflow-derived `numerical-instability`, and a property test proving solar
heat gain decreases monotonically as shaded fraction increases.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add transient lumped-capacitance helpers once a concrete container needs time
  response.
- Add view-factor radiation helpers only after a visual defines the geometry
  contract.
- Add material libraries as content data, not hidden kernel presets.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency.
- P1 issues checked: public API is deliberately narrow, all physical public
  quantities are branded, all expected failures return `KernelResult.err`, and
  layer inputs are not mutated.
- High-bandwidth questions surfaced: transient heat equations, daylight,
  thermal comfort, material catalogues, and building-energy simulation are
  intentionally deferred until their first consuming containers define the
  required contract.
- Outcome: the kernel provides canonical numbers for heat-transfer visuals; any
  facade heat-gain card, U-value readout, or heat-balance display that diverges
  from these functions should fail review.
