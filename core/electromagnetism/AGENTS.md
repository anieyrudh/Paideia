# core/electromagnetism · agent contract

## What this module is
The deterministic electromagnetism kernel for Paideia simulations. It owns
closed-form point-charge electric field, electric force, potential, and
potential-energy helpers in SI units, plus ideal uniform-flux induction
calculations for Faraday-Lenz simulations. It is pure TypeScript and returns
`KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/electromagnetism`:

- `coulombConstantVacuum: number`
- `electromagnetismTolerance: { default: number; tight: number; loose: number }`
- `type Coulombs`
- `type Volts`
- `type NewtonsPerCoulomb`
- `type Teslas`
- `type Webers`
- `type PointChargeElectricFieldInput`
- `type PointChargePotentialInput`
- `type ElectricForceInput`
- `type ElectricPotentialEnergyInput`
- `type PointChargeModelInput`
- `type PointChargeModel`
- `LenzOpposition = "oppose-increase" | "oppose-decrease" | "no-change"`
- `type UniformFluxInductionInput`
- `type UniformFluxInductionModel`
- `coulombs(value: number): Coulombs`
- `volts(value: number): Volts`
- `newtonsPerCoulomb(value: number): NewtonsPerCoulomb`
- `teslas(value: number): Teslas`
- `webers(value: number): Webers`
- `pointChargeElectricField(input: PointChargeElectricFieldInput): KernelResult<Vector2>`
- `pointChargeElectricPotential(input: PointChargePotentialInput): KernelResult<Volts>`
- `electricForceOnCharge(input: ElectricForceInput): KernelResult<Vector2>`
- `electricPotentialEnergy(input: ElectricPotentialEnergyInput): KernelResult<Joules>`
- `pointChargeModel(input: PointChargeModelInput): KernelResult<PointChargeModel>`
- `uniformFluxInductionModel(input: UniformFluxInductionInput): KernelResult<UniformFluxInductionModel>`

## Invariants the caller must preserve
- All numeric inputs are SI values: C, m, N/C, V, J.
- `pointMetres` is the vector from the source charge to the field point.
- `minRadiusMetres`, when supplied, must be finite and non-negative.
- Point-charge field and potential are undefined at the source. Callers may
  supply `minRadiusMetres` to clamp a near-source display to zero field.
- Uniform-flux induction inputs use SI values: T, m^2, s, ohm, Wb, V, A.
- `angleToNormalDegrees` is the angle between magnetic field and the loop normal,
  constrained to 0 through 90 degrees.
- `uniformFluxInductionModel` uses the sign convention `emf = -N Delta Phi / Delta t`.

## What this module does NOT do
- Does **not** render field lines, vector plots, charges, or apparatus.
- Does **not** model distributed charges, arbitrary magnetic fields, moving
  conductors, self-inductance, mutual inductance, eddy currents, transformers,
  circuits beyond a simple induced-current readout, relativity, or material
  permittivity.
- Does **not** know about A-Level or SUTD branch-specific conventions.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/electromagnetism` when a simulation needs shared point-charge
calculations for `E = kQ/r^2`, `F = qE`, `V = kQ/r`, or `U = qV`, or an ideal
Faraday-Lenz readout for `Phi = BA cos(theta)` and
`emf = -N Delta Phi / Delta t`. If a sim is about to inline those formulae, use
this module instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every consuming electromagnetism sim.
2. Add property tests for every new physical invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` instead of `KernelResult.err(...)`.
- Mixing centimetres, microcoulombs, nanocoulombs, or degrees into public inputs.
- Adding branch-specific constants or syllabus flags.
- Mutating vectors or arrays supplied by callers.
- Adding a physics engine dependency for closed-form point-charge or uniform
  flux induction formulae.

## How the Anieyrudh Filter reads this module
The Filter checks that electric-field visuals make the same quantitative claims
as this kernel. A field arrow, force arrow, potential readout, or energy
calculation whose displayed values disagree with these functions beyond
`electromagnetismTolerance` is rejected.
