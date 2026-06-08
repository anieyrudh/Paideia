# core/reaction-kinetics - agent contract

## What this module is

Pure first-year reaction-kinetics kernels for teaching integrated rate laws,
half-life comparisons, Arrhenius temperature sensitivity, and bounded
concentration-time samples. It returns deterministic numbers and readonly
records only; particle animations, curve rendering, fitted experimental data,
mechanism inference, and curriculum-specific presets live elsewhere.

## Public interface

Exports from `@paideia/reaction-kinetics`:

- `ConcentrationMolar = Brand<number, "ReactionKinetics.ConcentrationMolar">`
- `RateConstant = Brand<number, "ReactionKinetics.RateConstant">`
- `ActivationEnergyJoulesPerMole = Brand<number, "ReactionKinetics.ActivationEnergyJoulesPerMole">`
- `ReactionOrder = 0 | 1 | 2`
- `RateLawInput = { order: ReactionOrder; initialConcentration: ConcentrationMolar; rateConstant: RateConstant; elapsedSeconds: Seconds }`
- `HalfLifeInput = { order: ReactionOrder; initialConcentration: ConcentrationMolar; rateConstant: RateConstant }`
- `ConcentrationPoint = { timeSeconds: Seconds; concentration: ConcentrationMolar }`
- `ConcentrationSeriesInput = { order: ReactionOrder; initialConcentration: ConcentrationMolar; rateConstant: RateConstant; endSeconds: Seconds; sampleCount: number; startSeconds?: Seconds }`
- `ArrheniusRateRatioInput = { activationEnergyJoulesPerMole: ActivationEnergyJoulesPerMole; initialTemperatureKelvins: Kelvins; finalTemperatureKelvins: Kelvins }`
- `concentrationMolar(value: number): KernelResult<ConcentrationMolar>`
- `rateConstant(value: number): KernelResult<RateConstant>`
- `activationEnergyJoulesPerMole(value: number): KernelResult<ActivationEnergyJoulesPerMole>`
- `concentrationAtTime(input: RateLawInput): KernelResult<ConcentrationMolar>`
- `halfLife(input: HalfLifeInput): KernelResult<Seconds>`
- `sampleConcentrationSeries(input: ConcentrationSeriesInput): KernelResult<readonly ConcentrationPoint[]>`
- `arrheniusRateRatio(input: ArrheniusRateRatioInput): KernelResult<number>`

## Invariants the caller must preserve

- `order` is exactly `0`, `1`, or `2`.
- Concentrations are finite and non-negative mol/L.
- Rate constants are finite and non-negative in the units implied by the
  selected reaction order.
- Time values are finite and non-negative seconds.
- Half-life calculations require positive initial concentration and positive
  rate constant.
- Concentration samples require `sampleCount >= 2`, finite bounds, and
  `startSeconds <= endSeconds`.
- Arrhenius rate-ratio inputs require positive finite temperatures and
  non-negative finite activation energy.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not fit kinetic parameters from experimental data.
- Does not infer mechanisms or molecularity.
- Does not solve coupled reaction networks or stiff differential equations.
- Does not model reversible, autocatalytic, enzyme, chain, or photochemical
  mechanisms.
- Does not render graphs, particles, or UI controls.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/reaction-kinetics` when a sim needs canonical concentration-time
curves, half-life comparisons, or a simple Arrhenius temperature-ratio readout.
If a sim is about to inline zero-order, first-order, second-order, or Arrhenius
formulas, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formulas, constants, error behavior, or numeric
   semantics for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN`, `Infinity`, or negative concentration instead of
  `KernelResult.err(...)` or depletion-clipped zero where documented.
- Mutating caller-owned input records or sample arrays.
- Hiding rate-constant units behind syllabus-specific flags.
- Treating this as a chemistry solver platform.
- Rendering kinetics visuals from this package.

## How the Anieyrudh Filter reads this module

The Filter probes that displayed kinetic curves match this kernel: zero-order
curves deplete linearly to zero, first-order curves decay exponentially,
second-order curves follow reciprocal concentration, half-life comparisons use
the same rate constant and initial concentration shown to the learner, and
Arrhenius readouts use the stated Kelvin temperatures. A visual that teaches
different kinetics fails review.
