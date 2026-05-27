# @paideia/thermodynamics Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: thermodynamic
unit brands, constants, input/result types, and pure kernel functions for
temperature conversion, ideal-gas calculations, heat transfer, pressure-volume
traces, engine efficiency, and Carnot efficiency.

## Numerical model

The kernel uses standard introductory thermodynamics formulae:

```text
T_K = T_C + 273.15
pV = nRT
Q = mc Delta T
eta = W_out / Q_in
eta_Carnot = 1 - T_cold / T_hot
```

Public gas-law values are SI: pascals, cubic metres, inverse cubic metres,
moles, kelvins, joules, kilograms, joules per mole kelvin, and joules per
kilogram kelvin. Celsius is allowed only at the conversion boundary.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Celsius cannot convert below absolute zero | `kelvinFromCelsius` returns `out-of-domain` |
| Kelvin temperatures are non-negative at conversion boundaries | `celsiusFromKelvin` returns `precondition-violated` |
| Ideal-gas amount, temperature, pressure, and volume are positive where required | `positive` guards return `precondition-violated` |
| Heat-transfer mass is non-negative and specific heat is positive | `heatTransfer` guards |
| Pressure-volume traces have an increasing positive volume range | `pressureVolumeTrace` guard |
| Trace sample count is bounded | `pressureVolumeTrace` enforces `2..20001` |
| Returned trace arrays and points are immutable | `Object.freeze` on each point and the returned array |
| Public physical constants and derived trace quantities are branded | `JoulesPerMoleKelvin` and `InverseCubicMetres` |
| Engine efficiency stays in `[0, 1]` | `thermalEfficiency` returns `out-of-domain` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers Celsius/Kelvin conversion, ideal gas pressure and
volume, `pV = nRT`, invalid gas states, pressure-volume trace bounds, heat
transfer direction, engine efficiency, Carnot efficiency, and property-based
Boyle-law checks for fixed-temperature traces. The suite also covers an
overflow-derived `numerical-instability` path.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add latent-heat helpers once a concrete container needs phase-change
  calculation.
- Add conduction/convection/radiation helpers as separate focused kernels or
  extensions after the first heat-transfer visual defines the required scope.
- Add more edge-case tests around trace sample limits and near-absolute-zero
  conversion if future consumers need those ranges.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency.
- P1 issues checked: public API is deliberately narrow, Celsius is blocked from
  gas-law inputs by type, all expected failures return `KernelResult.err`,
  physical constants and derived trace quantities are branded, and trace output
  is deterministic enough for simulations to cite.
- High-bandwidth questions surfaced: phase change, heat transport, entropy, and
  full thermodynamic cycles are intentionally deferred until their first
  consuming containers define the required contract.
- Outcome: the kernel provides canonical numbers for thermal visuals; any gas
  law readout, PV trace, heat-transfer card, or efficiency display that
  diverges from these functions should fail review.
