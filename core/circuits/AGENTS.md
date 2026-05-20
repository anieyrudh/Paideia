# core/circuits · agent contract

## What this module is
The deterministic electrical circuits kernel for introductory circuit simulations. It owns Ohm's law, series/parallel resistance equivalents, voltage dividers, a small modified-nodal-analysis solver for ideal DC resistor/source networks, and first-order series AC impedance/phasor calculations for resistors, inductors, and capacitors. It returns numbers in SI units and signed circuit quantities so every sim reports the same Kirchhoff-consistent result.

## Public interface
Exports from `@paideia/circuits`:

- `CircuitNodeId = Brand<string, "CircuitNodeId">`
- `CircuitElementId = Brand<string, "CircuitElementId">`
- `nodeId(id: string): KernelResult<CircuitNodeId>`
- `elementId(id: string): KernelResult<CircuitElementId>`
- `CircuitTolerance = { readonly default: number; readonly tight: number; readonly loose: number }`
- `circuitTolerance: CircuitTolerance`
- `OhmsLawInput = { readonly voltageVolts?: number; readonly currentAmps?: number; readonly resistanceOhms?: number }`
- `OhmsLawResult = { readonly voltageVolts: number; readonly currentAmps: number; readonly resistanceOhms: number; readonly powerWatts: number }`
- `ohmsLaw(input: OhmsLawInput): KernelResult<OhmsLawResult>` — solve the one missing value among `V`, `I`, and `R`; if all three are present, validate consistency.
- `combineSeries(resistancesOhms: readonly number[]): KernelResult<number>` — equivalent resistance for resistors in series.
- `combineParallel(resistancesOhms: readonly number[]): KernelResult<number>` — equivalent resistance for resistors in parallel.
- `voltageDivider(supplyVoltageVolts: number, resistancesOhms: readonly number[]): KernelResult<readonly number[]>` — voltage drops across a series chain in input order.
- `ComplexImpedance = { readonly realOhms: number; readonly imaginaryOhms: number }`
- `SeriesAcElement = { kind: "resistor"; resistanceOhms: number } | { kind: "inductor"; inductanceHenrys: number } | { kind: "capacitor"; capacitanceFarads: number }`
- `SeriesAcCircuitInput = { readonly sourceVoltageRmsVolts: number; readonly frequencyHertz: number; readonly elements: readonly SeriesAcElement[] }`
- `SeriesAcCircuitSolution = { readonly impedance: ComplexImpedance; readonly elementImpedances: readonly ComplexImpedance[]; readonly impedanceMagnitudeOhms: number; readonly impedancePhaseRadians: number; readonly currentRmsAmps: number; readonly currentPhaseRadians: number; readonly powerFactor: number; readonly apparentPowerVoltAmps: number; readonly realPowerWatts: number; readonly reactivePowerVars: number }`
- `solveSeriesAcCircuit(input: SeriesAcCircuitInput): KernelResult<SeriesAcCircuitSolution>` — solve equivalent series RLC impedance, RMS current, current phase relative to a 0 degree voltage reference, power factor, and AC power terms.
- `ResistorElement = { readonly kind: "resistor"; readonly id: CircuitElementId; readonly from: CircuitNodeId; readonly to: CircuitNodeId; readonly resistanceOhms: number }`
- `CurrentSourceElement = { readonly kind: "current-source"; readonly id: CircuitElementId; readonly from: CircuitNodeId; readonly to: CircuitNodeId; readonly currentAmps: number }` — positive current flows from `from` to `to`.
- `VoltageSourceElement = { readonly kind: "voltage-source"; readonly id: CircuitElementId; readonly positive: CircuitNodeId; readonly negative: CircuitNodeId; readonly voltageVolts: number }`
- `DcCircuitElement = ResistorElement | CurrentSourceElement | VoltageSourceElement`
- `DcCircuit = { readonly referenceNode: CircuitNodeId; readonly elements: readonly DcCircuitElement[] }`
- `NodeVoltage = { readonly node: CircuitNodeId; readonly voltageVolts: number }`
- `ElementCurrent = { readonly element: CircuitElementId; readonly currentAmps: number }`
- `ElementPower = { readonly element: CircuitElementId; readonly powerWatts: number }`
- `DcCircuitSolution = { readonly nodeVoltages: readonly NodeVoltage[]; readonly elementCurrents: readonly ElementCurrent[]; readonly elementPowers: readonly ElementPower[] }`
- `solveDcCircuit(circuit: DcCircuit): KernelResult<DcCircuitSolution>` — solve the linear DC network with the reference node fixed at 0 V.

## Invariants the caller must preserve
- Node and element IDs are stable, non-empty strings created with `nodeId` and `elementId`.
- Resistor values are finite and strictly positive in ohms.
- AC source RMS voltage, frequency, inductance, and capacitance are finite and strictly positive.
- Source values are finite SI values. Signed current and voltage are allowed.
- `DcCircuit.referenceNode` is the ground node and is always reported at `0 V`.
- Element current signs follow each element's declared orientation: resistor `from -> to`, current source `from -> to`, voltage source `positive -> negative`.
- Element power uses the passive sign convention for the same orientation: positive power is absorbed, negative power is delivered.
- `ohmsLaw` consistency checks compare `V` against `IR` with `circuitTolerance.loose`, scaled by `max(1, abs(expectedVoltage))`.
- AC phase uses source voltage as the 0 rad reference. Positive impedance phase is inductive; current phase is `-impedancePhaseRadians`.

## What this module does NOT do
- Does **not** render schematics, waveforms, phasors, or UI controls.
- Does **not** solve nonlinear components, dependent sources, arbitrary AC networks, filters, transformers, or transient systems. Those require explicit future contracts.
- Does **not** infer topology from a drawing; callers pass the netlist directly.
- Does **not** mutate input arrays or cache results in hidden module state.
- Does **not** silently add a ground or leakage path for floating circuits; singular networks return `KernelResult.err(...)`.
- Does **not** use branch-specific shortcuts or curriculum flags.

## When to consider this module
Use `core/circuits` when a sim needs Ohm's law checks, equivalent resistance, voltage drops in a divider, a DC operating point for a small ideal linear circuit, or a series RLC impedance/phasor calculation. If a sim is about to hand-roll Kirchhoff equations or impedance vector arithmetic, stop and use this module.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (A-Level electricity sims, SUTD circuits labs, any diagnostics that compare power balance).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to sign conventions, tolerance, or supported element semantics.

## Anti-patterns (will be rejected in PR review)
- Returning `NaN` or `Infinity` for invalid circuits instead of a `KernelResult.err(...)`.
- Mutating the caller's netlist while assigning node indices.
- Adding SPICE-compatible syntax or a parser inside this kernel.
- Reimplementing impedance/reactance arithmetic in a container or branch sim instead of adding a reviewed kernel primitive.
- Hiding numerical regularisation in singular matrices.
- Treating current-source direction differently in different consumers.
- Branch-specific tolerances or sign conventions.

## How the Anieyrudh Filter reads this module
The Filter probes that **a sim's displayed voltages, currents, and power balance are Kirchhoff-consistent with this kernel's signed solution**. A circuit visualisation that shows a current direction, node voltage, or delivered/absorbed power inconsistent with `solveDcCircuit` beyond `circuitTolerance.default` is rejected.
