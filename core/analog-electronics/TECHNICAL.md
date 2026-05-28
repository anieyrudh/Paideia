# @paideia/analog-electronics Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: SI unit brands,
constructors, input/result types, and pure kernel functions for ideal inverting,
non-inverting, balanced difference, and inverting summing op-amp stages with
explicit rail saturation.

## Numerical model

The kernel uses ideal op-amp teaching formulae:

```text
Inverting: V_out = -(R_f / R_in) V_in
Non-inverting: V_out = (1 + R_f / R_g) V_in
Difference: V_out = (R_f / R_in) (V_plus - V_minus)
Inverting summer: V_out = -R_f sum(V_i / R_i)
Saturation: V_out = clamp(V_ideal, V_negative_rail, V_positive_rail)
```

Public values are SI: volts, ohms, and volts per volt. Saturation is explicit:
every compound result reports both the ideal output and the rail-limited output
plus a `none`, `positive`, or `negative` saturation state.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Positive resistances and feedback denominators | `positive` guards return `precondition-violated` |
| Finite input and rail voltages | `finite` guards return `precondition-violated` |
| Output rails are ordered correctly | `validateOutputLimit` returns `out-of-domain` |
| Summer arrays are non-empty and index-paired | `idealInvertingSummer` returns `precondition-violated` |
| Compound stage results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers every public function with formula examples, invalid
input paths, saturation behavior, immutable compound results, summer input
immutability, and a property test for inverting gain scaling.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add first-order active-filter helpers only after a consuming container fixes
  frequency-response conventions.
- Add comparator and Schmitt-trigger helpers after a digital/analog boundary
  container defines threshold semantics.
- Add real-op-amp non-idealities only after a future contract names which
  datasheet parameters are allowed.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency beyond `@paideia/shared`.
- P1 issues checked: public API is deliberately narrow, all public physical
  quantities are SI-branded, expected failures return `KernelResult.err`,
  rail saturation is explicit rather than hidden, and result objects used by
  visuals are immutable.
- High-bandwidth questions surfaced: SPICE, arbitrary circuit solving, filters,
  transient response, real op-amp bandwidth, slew rate, offset, bias current,
  common-mode limits, and noise are intentionally deferred until consuming
  containers define the required contract.
- Outcome: the kernel provides canonical numbers for ideal op-amp visuals; any
  gain label, output readout, summing term, difference result, or saturation
  indicator that diverges from these functions should fail review.
