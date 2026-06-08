# @paideia/circuits Technical Notes

## Public Interface Summary

The package exports branded ID constructors, numeric circuit helpers, one DC operating-point solver, and one additive series AC phasor solver:

- `nodeId`, `elementId`
- `circuitTolerance`
- `ohmsLaw`
- `combineSeries`
- `combineParallel`
- `voltageDivider`
- `solveSeriesAcCircuit`
- `solveDcCircuit`
- The read-only types listed in `AGENTS.md`

`solveSeriesAcCircuit` supports finite positive series resistor, inductor, and capacitor elements. It returns total complex impedance, per-element impedances, RMS current, current phase relative to a 0 rad source-voltage reference, power factor, apparent power, real power, and reactive power.

`solveDcCircuit` supports ideal resistors, independent current sources, and independent voltage sources. It fixes `referenceNode` at `0 V` and solves the resulting modified nodal analysis matrix with partial-pivot Gauss-Jordan elimination.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| IDs are non-empty stable strings | `nodeId` and `elementId` trim and validate before branding. |
| Resistances are finite and strictly positive | `positiveResistance` guard returns `precondition-violated`. |
| AC frequency, inductance, and capacitance are finite and strictly positive | `positiveFinite` guard returns `precondition-violated`. |
| Sources and supply values are finite SI numbers | `finite` guard returns `precondition-violated`. |
| Equivalent resistance does not mutate input arrays | Helpers iterate and accumulate into local values only. |
| Ohm's law all-value calls are consistent | `ohmsLaw` compares `V` with `IR` using `circuitTolerance.loose`. |
| Floating or contradictory ideal networks do not produce fake answers | The linear solver returns `convergence-failed` when the MNA matrix is singular. |
| Element signs are stable | Current and power are computed from the orientation declared in each element shape. |
| Expected failures are values | Public functions return `KernelResult`, not thrown exceptions, for invalid inputs. |

## Numerical Method

The series AC solver forms the impedance sum directly:

```text
Z = R + j(2 pi f L - 1 / (2 pi f C))
```

It then derives `|Z|`, impedance phase, `I_rms = V_rms / |Z|`, current phase `-angle(Z)`, and the standard apparent/real/reactive power terms. It does not solve arbitrary AC networks or transient behaviour.

The DC solver builds the standard MNA system:

```text
[G B] [v] = [i]
[B'0] [j]   [e]
```

`G` is stamped from conductances, `B` from independent voltage sources, `i` from current-source injections, and `e` from source voltages. The voltage-source unknown current is signed from `positive` to `negative`, so a source delivering power usually has negative current and negative power.

The current implementation is intended for small educational netlists, not large SPICE workloads. It deliberately returns an error for singular systems instead of adding hidden regularisation.

## Dependency And License Notes

Runtime dependencies:

- `@paideia/shared` (`workspace:*`)

Dev dependencies are already present in the workspace:

- `typescript`
- `vitest`

No new third-party runtime dependency is introduced. The implementation is hand-written under the repository license and does not inspect or port GPL, AGPL, or LGPL circuit-solver source.

## Anieyrudh Filter pass

P0 issues resolved: AC phasor arithmetic is implemented in `core/circuits` through `solveSeriesAcCircuit`, not in the container; invalid non-finite or non-positive values return `KernelResult.err(...)`; existing DC sign conventions and solver behavior are unchanged.

P1 issues addressed or deferred: additive core API traceability is tracked in GitHub issue #110; the electrical-unit branding migration is deferred to GitHub issue #111 because `core/shared` does not currently expose electrical unit brands and tightening this API would require a broad `core!` migration.

The Filter should verify that a simulation using this kernel keeps displayed voltages, currents, phase, impedance, and power balance aligned with `solveSeriesAcCircuit` or `solveDcCircuit` to within `circuitTolerance.default`. It should also probe invalid circuits: a floating DC netlist or invalid AC parameter must surface a kernel error instead of showing plausible-looking values. The passive sign convention is explicit so learner-facing arrows cannot silently flip source and load behaviour.
