# core/uncertainty-propagation · agent contract

## What this module is
The deterministic measurement-uncertainty kernel for shared science and engineering simulations. It owns absolute uncertainty, relative and percentage uncertainty, first-order propagation rules for sums, products, quotients, and simple powers, plus the classroom helper that chooses the larger of repeated-reading spread and instrument resolution. It returns pure data with display-ready explanatory steps: no React, no rendering, no learner state, and no branch-specific behavior.

## Public interface
Exports from `@paideia/uncertainty-propagation`:

- `UncertaintyQuantity = Brand<number, string>`
- `DimensionlessQuantity = Brand<number, "DimensionlessQuantity">`
- `dimensionless(value: number): DimensionlessQuantity`
- `UncertaintyStep = { label: string; expression: string; result: string }`
- `MeasuredValue<TUnit extends UncertaintyQuantity = UncertaintyQuantity> = { value: TUnit; absoluteUncertainty: TUnit; label?: string; unit?: string }`
- `UncertaintyPropagation<TValue extends number = UncertaintyQuantity, TAbsolute extends number = TValue> = { value: TValue; absoluteUncertainty: TAbsolute; relativeUncertainty: DimensionlessQuantity; percentageUncertainty: DimensionlessQuantity; steps: readonly UncertaintyStep[] }`
- `UncertaintySource<TUnit extends UncertaintyQuantity = UncertaintyQuantity> = { kind: "repeated-readings" | "instrument-resolution" | "manual"; absoluteUncertainty: TUnit; label: string; steps: readonly UncertaintyStep[] }`
- `PropagationTerm<TUnit extends UncertaintyQuantity = UncertaintyQuantity> = { measurement: MeasuredValue<TUnit>; operation?: "add" | "subtract" }`
- `PropagationFactor<TUnit extends UncertaintyQuantity = UncertaintyQuantity> = { measurement: MeasuredValue<TUnit>; operation?: "multiply" | "divide" }`
- `InstrumentResolutionRule = "half-resolution" | "full-resolution"`
- `uncertaintyTolerance: { default: number; tight: number; loose: number }`
- `measuredValue<TUnit extends UncertaintyQuantity>(value: TUnit, absoluteUncertainty: TUnit, opts?: { label?: string; unit?: string }): KernelResult<MeasuredValue<TUnit>>`
- `absoluteUncertainty<TUnit extends UncertaintyQuantity>(measurement: MeasuredValue<TUnit>): KernelResult<TUnit>`
- `relativeUncertainty<TUnit extends UncertaintyQuantity>(measurement: MeasuredValue<TUnit>): KernelResult<DimensionlessQuantity>`
- `percentageUncertainty<TUnit extends UncertaintyQuantity>(measurement: MeasuredValue<TUnit>): KernelResult<DimensionlessQuantity>`
- `addSubtractAbsoluteUncertainty<TUnit extends UncertaintyQuantity>(terms: readonly PropagationTerm<TUnit>[]): KernelResult<UncertaintyPropagation<TUnit>>`
- `multiplyDivideRelativeUncertainty(factors: readonly PropagationFactor[]): KernelResult<UncertaintyPropagation<number, number>>`
- `powerUncertainty(measurement: MeasuredValue, exponent: DimensionlessQuantity): KernelResult<UncertaintyPropagation<number, number>>`
- `repeatedReadingUncertainty<TUnit extends UncertaintyQuantity>(readings: readonly TUnit[], opts?: { label?: string }): KernelResult<UncertaintySource<TUnit>>`
- `instrumentResolutionUncertainty<TUnit extends UncertaintyQuantity>(resolution: TUnit, opts?: { label?: string; rule?: InstrumentResolutionRule }): KernelResult<UncertaintySource<TUnit>>`
- `chooseLargerUncertaintySource<TUnit extends UncertaintyQuantity>(sources: readonly UncertaintySource<TUnit>[]): KernelResult<UncertaintySource<TUnit>>`
- `measurementUncertaintyFromSources<TUnit extends UncertaintyQuantity>(opts: { repeatedReadings?: readonly TUnit[]; instrumentResolution?: TUnit; instrumentResolutionRule?: InstrumentResolutionRule; label?: string }): KernelResult<UncertaintySource<TUnit>>`
- `formatUncertainty(measurement: MeasuredValue, opts?: { unit?: string; places?: number }): KernelResult<string>`

## Invariants the caller must preserve
- Values and uncertainties are finite SI-scaled numbers at the call boundary.
- Add/subtract terms represent the same physical unit. Type brands help callers
  preserve that at compile time, but runtime values are numbers and this kernel
  does not infer or convert units.
- Absolute uncertainties are non-negative; instrument resolutions must be strictly positive.
- Relative uncertainty is defined only for non-zero measured values.
- Add/subtract propagation adds absolute uncertainties.
- Multiply/divide propagation adds relative uncertainties.
- Power propagation uses the simple first-order rule `relative uncertainty in x^n = |n| × relative uncertainty in x`.
- Repeated-reading uncertainty is half the observed range. The final classroom source is the larger of repeated-reading uncertainty and instrument-resolution uncertainty.

## What this module does NOT do
- Does **not** infer compound unit brands. Derived units remain caller-owned display strings.
- Does **not** round to significant figures for final assessment marking. `formatUncertainty` is a display helper, not an examiner.
- Does **not** compute covariance, correlated-error propagation, logarithmic rules, trigonometric rules, or Monte Carlo uncertainty.
- Does **not** render. Pair with `core/ui-sim`, `core/charting`, or branch package UI code.
- Does **not** mutate caller arrays or cache hidden state.

## When to consider this module
Use `core/uncertainty-propagation` when a sim needs canonical measurement uncertainty, percentage uncertainty, propagated uncertainty through arithmetic, or a repeat-vs-resolution decision. If a sim is about measurements and starts hand-writing "percentage uncertainties add", consume this module instead of inlining the formula.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for any public type change or formula/default change that shifts existing numeric outputs or displayed steps.

## Anti-patterns (will be rejected in PR review)
- Returning `NaN`/`Infinity` instead of `KernelResult.err(...)`.
- Silently clamping negative uncertainty to zero.
- Treating uncertainty in zero-valued denominators as valid relative uncertainty.
- Hiding branch-specific A-Level or SUTD rules in the kernel.
- Recomputing propagated uncertainty in UI code instead of displaying the returned steps.

## How the Anieyrudh Filter reads this module
The Filter probes that **measurement claims display the same uncertainty rule the kernel used**. A speed notebook that says quotient percentage uncertainties add must use `multiplyDivideRelativeUncertainty`; a repeated-reading panel must select the larger source returned by `measurementUncertaintyFromSources`; a power-law display must match `powerUncertainty` within `uncertaintyTolerance.default`.
