# core/dimensional-analysis · agent contract

## What this module is

The deterministic dimensional-analysis kernel for Paideia simulations. It owns
SI base-dimension vectors, derived dimensions, unit fingerprints, dimensional
arithmetic, compatibility checks, readable formatting, and diagnostics for
equations that try to combine incompatible physical quantities.

## Public interface

Exports from `@paideia/dimensional-analysis`:

- `type BaseDimension`
- `type DimensionExponents`
- `interface Dimension`
- `interface Unit`
- `interface DimensionDifference`
- `interface EquationDiagnostic`
- `dimensionalAnalysisTolerance: { default: number; zero: number }`
- `baseDimensions: Readonly<Record<BaseDimension, Dimension>>`
- `dimension(exponents?: Partial<Record<BaseDimension, number>>): KernelResult<Dimension>`
- `unit(symbol: string, dimension: Dimension, scale?: number): KernelResult<Unit>`
- `multiplyDimensions(left: Dimension, right: Dimension): KernelResult<Dimension>`
- `divideDimensions(left: Dimension, right: Dimension): KernelResult<Dimension>`
- `powerDimension(input: Dimension, exponent: number): KernelResult<Dimension>`
- `multiplyUnits(left: Unit, right: Unit): KernelResult<Unit>`
- `divideUnits(left: Unit, right: Unit): KernelResult<Unit>`
- `powerUnit(input: Unit, exponent: number): KernelResult<Unit>`
- `dimensionsEqual(left: Dimension, right: Dimension): KernelResult<boolean>`
- `compatibleDimensions(left: Dimension, right: Dimension): KernelResult<boolean>`
- `diagnoseEquation(left: Dimension, right: Dimension, labels?: { left?: string; right?: string }): KernelResult<EquationDiagnostic>`
- `formatDimension(input: Dimension): KernelResult<string>`
- `formatUnit(input: Unit): KernelResult<string>`

## Invariants the caller must preserve

- Dimensions are exponent vectors over the seven SI base dimensions: mass,
  length, time, electric current, thermodynamic temperature, amount of
  substance, and luminous intensity.
- Exponents must be finite real numbers. Integer exponents are common, but
  fractional exponents are allowed for roots and squared quantities.
- Unit `scale` is a positive finite multiplier to the corresponding SI unit.
  This kernel records scale for downstream conversion logic but does not
  perform conversion between named units.
- Compatibility means equal dimension exponents within
  `dimensionalAnalysisTolerance.default`. It does not prove that a physical
  equation is correct.

## What this module does NOT do

- Does **not** parse free-form learner equations or symbolic algebra.
- Does **not** evaluate numerical quantities or propagate measurement
  uncertainty.
- Does **not** render tables, unit cards, or equation builders.
- Does **not** maintain a large unit registry. Sims can declare only the units
  they need at their boundary.
- Does **not** keep branch-specific or curriculum-specific conventions.

## When to consider this module

Use `core/dimensional-analysis` when a sim needs to derive dimensions such as
speed (`L T^-1`), acceleration (`L T^-2`), force (`M L T^-2`), pressure
(`M L^-1 T^-2`), or to reject addition/equality claims between incompatible
quantities. If a sim is about to inline unit fingerprints such as `"m + s"` or
`"m s^-1"`, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Add algebraic property tests for every new dimension operation.
3. Use `core!:` for public API changes that alter compatibility semantics,
   base-dimension keys, formatting, or diagnostic shape.

## Anti-patterns

- Returning `NaN`, `Infinity`, or malformed exponent objects instead of
  `KernelResult.err(...)`.
- Treating dimensional compatibility as proof that the physics is true.
- Hiding unit registries or curriculum aliases inside the kernel.
- Mutating dimension or unit values supplied by the caller.
- Adding a symbolic-math dependency for exponent-vector arithmetic.

## How the Anieyrudh Filter reads this module

The Filter checks that simulations which teach unit logic use this kernel's
dimension fingerprints and equation diagnostics consistently. A visual that
claims distance plus time is valid, or labels speed as `L T^-2`, is rejected
because it contradicts the shared dimensional-analysis kernel.
