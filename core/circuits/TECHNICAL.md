# @paideia/circuits Technical Notes

## Public Interface Summary

The package exports branded ID constructors, numeric circuit helpers, and one DC operating-point solver:

- `nodeId`, `elementId`
- `circuitTolerance`
- `ohmsLaw`
- `combineSeries`
- `combineParallel`
- `voltageDivider`
- `solveDcCircuit`
- The read-only types listed in `AGENTS.md`

`solveDcCircuit` supports ideal resistors, independent current sources, and independent voltage sources. It fixes `referenceNode` at `0 V` and solves the resulting modified nodal analysis matrix with partial-pivot Gauss-Jordan elimination.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| IDs are non-empty stable strings | `nodeId` and `elementId` trim and validate before branding. |
| Resistances are finite and strictly positive | `positiveResistance` guard returns `precondition-violated`. |
| Sources and supply values are finite SI numbers | `finite` guard returns `precondition-violated`. |
| Equivalent resistance does not mutate input arrays | Helpers iterate and accumulate into local values only. |
| Ohm's law all-value calls are consistent | `ohmsLaw` compares `V` with `IR` using `circuitTolerance.loose`. |
| Floating or contradictory ideal networks do not produce fake answers | The linear solver returns `convergence-failed` when the MNA matrix is singular. |
| Element signs are stable | Current and power are computed from the orientation declared in each element shape. |
| Expected failures are values | Public functions return `KernelResult`, not thrown exceptions, for invalid inputs. |

## Numerical Method

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

The Filter should verify that a simulation using this kernel keeps displayed voltages, currents, and power balance aligned with `solveDcCircuit` to within `circuitTolerance.default`. It should also probe invalid circuits: a floating netlist must surface a kernel error instead of showing plausible-looking voltages. The passive sign convention is explicit so learner-facing arrows cannot silently flip source and load behaviour.
