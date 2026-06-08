# core/analog-electronics · agent contract

## What this module is
The deterministic analog-electronics kernel for Paideia simulations. It owns
ideal op-amp teaching blocks: inverting, non-inverting, balanced difference,
and inverting summing amplifiers, with explicit optional output rail saturation.
It is pure TypeScript, uses SI units, and returns `KernelResult` values for
expected invalid inputs.

## Public interface
Exports from `@paideia/analog-electronics`:

- `analogTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type Volts`
- `type Ohms`
- `type VoltsPerVolt`
- `type SaturationState`
- `type OutputLimitInput`
- `type OpAmpStageResult`
- `type InvertingAmplifierInput`
- `type NonInvertingAmplifierInput`
- `type DifferenceAmplifierInput`
- `type InvertingSummerInput`
- `volts(value: number): Volts`
- `ohms(value: number): Ohms`
- `idealInvertingAmplifier(input: InvertingAmplifierInput): KernelResult<OpAmpStageResult>`
- `idealNonInvertingAmplifier(input: NonInvertingAmplifierInput): KernelResult<OpAmpStageResult>`
- `idealDifferenceAmplifier(input: DifferenceAmplifierInput): KernelResult<OpAmpStageResult>`
- `idealInvertingSummer(input: InvertingSummerInput): KernelResult<OpAmpStageResult>`

## Invariants the caller must preserve
- Public physical quantities use SI units: volts, ohms, and volts per volt.
- Resistance values are finite and strictly positive.
- Input voltages and output rail voltages are finite signed voltages.
- Output rails, when provided, must satisfy `positiveRailVolts > negativeRailVolts`.
- Difference amplifier assumes a balanced resistor ratio; callers pass one
  input resistance and one feedback resistance to define the ideal gain.
- Inverting summer arrays are read-only, non-empty, same length, and paired by
  index.

## What this module does NOT do
- Does **not** render schematics, waveforms, knobs, meters, or UI controls.
- Does **not** solve arbitrary circuits, parse netlists, or model op-amp input
  bias current, offset voltage, slew rate, bandwidth, noise, output impedance,
  common-mode limits, or real datasheet behavior.
- Does **not** model semiconductor device physics or transistor-level circuits.
- Does **not** hide A-Level, SUTD, lab-kit, or container-specific presets.
- Does **not** keep hidden global state or random tolerance choices.

## When to consider this module
Use `core/analog-electronics` when a sim is about to inline ideal op-amp gain
formulas or clamp an ideal output to supply rails. If the sim needs real op-amp
datasheet behavior, SPICE-like circuit solving, filters, or transient response,
stop and define a narrower future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current analog-electronics
   or circuits sim that would consume the new primitive.
2. Add property tests for every new gain, saturation, or conservation invariant.
3. Use `core!:` for public API changes that alter existing sign conventions,
   formulas, or saturation behavior.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Adding SPICE syntax, arbitrary circuit solving, or hidden numerical
  regularisation inside this ideal block kernel.
- Adding branch-specific component presets or real datasheet constants.
- Treating rail saturation as implicit clipping without reporting the
  saturation state.
- Mutating caller-provided summer input arrays.

## How the Anieyrudh Filter reads this module
The Filter checks that op-amp visuals make the same quantitative claims as this
kernel. Gain labels, output readouts, summer terms, difference outputs, or rail
saturation indicators that disagree with these functions beyond
`analogTolerance.default` are rejected.
