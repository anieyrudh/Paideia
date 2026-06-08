# core/semiconductor-devices · agent contract

## What this module is
The deterministic semiconductor-device kernel for Paideia simulations. It owns
introductory diode and MOSFET teaching models: Shockley diode current/voltage,
a resistive diode load-line intersection, and an NMOS square-law operating
point. It is pure TypeScript, uses SI units, and returns `KernelResult` values
for expected invalid inputs.

## Public interface
Exports from `@paideia/semiconductor-devices`:

- `semiconductorTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `roomTemperatureThermalVoltageVolts: Volts`
- `type Volts`
- `type Amps`
- `type Ohms`
- `type AmpsPerVoltSquared`
- `type PerVolt`
- `type Siemens`
- `type DiodeShockleyInput`
- `type DiodeVoltageForCurrentInput`
- `type DiodeLoadLineInput`
- `type DiodeLoadLineResult`
- `type MosfetRegion`
- `type NmosSquareLawInput`
- `type NmosSquareLawResult`
- `volts(value: number): Volts`
- `amps(value: number): Amps`
- `ohms(value: number): Ohms`
- `ampsPerVoltSquared(value: number): AmpsPerVoltSquared`
- `perVolt(value: number): PerVolt`
- `diodeShockleyCurrent(input: DiodeShockleyInput): KernelResult<Amps>`
- `diodeVoltageForCurrent(input: DiodeVoltageForCurrentInput): KernelResult<Volts>`
- `solveResistiveDiodeLoadLine(input: DiodeLoadLineInput): KernelResult<DiodeLoadLineResult>`
- `nmosSquareLawOperatingPoint(input: NmosSquareLawInput): KernelResult<NmosSquareLawResult>`

## Invariants the caller must preserve
- Public physical quantities use SI units: volts, amps, ohms,
  amps per volt squared, and inverse volts.
- Saturation current, emission coefficient, thermal voltage, resistance, and
  transconductance parameter are finite and strictly positive.
- The load-line helper is a forward-bias teaching model with non-negative
  supply voltage and a single series resistor.
- Diode reverse current for the inverse helper must stay above `-I_s`; the
  logarithm is undefined at or below that asymptote.
- The NMOS helper uses a long-channel square-law model. Drain-source voltage
  and channel-length modulation are non-negative; threshold and gate-source
  voltage are finite signed voltages.

## What this module does NOT do
- Does **not** render device curves, circuit schematics, probe widgets, or UI.
- Does **not** parse SPICE netlists, solve arbitrary nonlinear circuits,
  perform transient simulation, or model temperature-dependent material data.
- Does **not** model BJT devices, body effect, subthreshold conduction, real
  datasheet corners, capacitances, breakdown, noise, mismatch, or process
  variation.
- Does **not** hide A-Level, SUTD, device-lab, or container-specific presets.
- Does **not** keep hidden global state or random fitting parameters.

## When to consider this module
Use `core/semiconductor-devices` when a sim is about to inline Shockley diode
equations, solve a single-resistor diode load line, or classify/compute an
ideal NMOS square-law operating point. If a sim needs a SPICE-like circuit
solver or datasheet-accurate semiconductor model, stop and define a separate
contract instead of widening this kernel.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current semiconductor or
   circuit sim that would consume the new primitive.
2. Add property tests for every new monotonicity, conservation, or region
   boundary invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs,
   sign conventions, or region classifications.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Adding SPICE-compatible syntax, netlist parsing, or Newton-Raphson circuit
  iteration inside this teaching kernel.
- Adding branch-specific semiconductor presets or datasheet constants.
- Silently clipping diode exponentials or MOSFET currents to hide invalid
  inputs.
- Treating the square-law MOSFET model as a real process/device model.

## How the Anieyrudh Filter reads this module
The Filter checks that semiconductor visuals make the same quantitative claims
as this kernel. A diode curve, load-line marker, MOSFET region label, or drain
current readout whose values disagree with these functions beyond
`semiconductorTolerance.default` is rejected.
