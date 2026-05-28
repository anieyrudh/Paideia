# @paideia/semiconductor-devices Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: SI unit brands,
constructors, input/result types, and pure kernel functions for Shockley diode
current/voltage, a resistive diode load-line intersection, and an NMOS
square-law operating point.

## Numerical model

The kernel uses introductory semiconductor equations:

```text
I_D = I_s (exp(V_D / (n V_T)) - 1)
V_D = n V_T ln(I_D / I_s + 1)
I_load = (V_supply - V_D) / R
NMOS cutoff: V_GS <= V_T
NMOS triode: I_D = k ((V_OV V_DS) - 0.5 V_DS^2) (1 + lambda V_DS)
NMOS saturation: I_D = 0.5 k V_OV^2 (1 + lambda V_DS)
```

Public values are SI: volts, amps, ohms, amps per volt squared, and inverse
volts. The load-line intersection uses deterministic bisection over the
bounded forward-bias interval `[0, V_supply]`; it is not a general nonlinear
circuit solver.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Positive physical coefficients and denominators | `positive` guards return `precondition-violated` |
| Non-negative load-line supply, drain-source voltage, and channel-length modulation | `nonNegative` guards |
| Shockley exponential inputs stay below the overflow limit | `diodeShockleyCurrent` and load-line evaluation return `numerical-instability` |
| Diode inverse current must stay above `-I_s` | `diodeVoltageForCurrent` returns `out-of-domain` |
| Load-line and MOSFET compound results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers every public function with formula examples, invalid
input paths, error codes, immutable compound results, diode monotonicity,
load-line KCL consistency, and MOSFET region monotonicity.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add PMOS symmetry helpers only after a consuming container fixes sign
  conventions.
- Add BJT Ebers-Moll teaching helpers after a transistor container defines the
  required device family and parameter naming.
- Add capacitance/switching-delay helpers only after a digital-electronics
  container defines the timing assumptions.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency beyond `@paideia/shared`.
- P1 issues checked: public API is deliberately narrow, all public physical
  quantities are SI-branded, expected failures return `KernelResult.err`,
  load-line solving is bounded and deterministic, and result objects used by
  visuals are immutable.
- High-bandwidth questions surfaced: SPICE, arbitrary nonlinear circuits,
  BJT modeling, capacitance, breakdown, subthreshold effects, body effect,
  process corners, and real datasheet fitting are intentionally deferred until
  their first consuming containers define the required contract.
- Outcome: the kernel provides canonical numbers for semiconductor visuals;
  any diode curve, load-line marker, MOSFET region label, or drain-current
  readout that diverges from these functions should fail review.
