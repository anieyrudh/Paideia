# core/electromagnetism · agent contract

## What this module is
The deterministic electromagnetism kernel for Paideia simulations. It owns
closed-form point-charge electric field, electric force, potential, and
potential-energy helpers in SI units, ideal parallel-plate capacitor helpers
for dielectric simulations, Gauss-law helpers for symmetric electric-flux
surfaces, plus ideal uniform-flux induction calculations for Faraday-Lenz
simulations and electromagnetic-wave helpers in SI units. It is pure TypeScript
and returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/electromagnetism`:

- `coulombConstantVacuum: number`
- `vacuumPermittivityFaradsPerMetre: number`
- `speedOfLightVacuumMetresPerSecond: number`
- `vacuumImpedanceOhms: number`
- `electromagnetismTolerance: { default: number; tight: number; loose: number }`
- `type Coulombs`
- `type CoulombsPerMetre`
- `type CoulombsPerSquareMetre`
- `type Volts`
- `type NewtonsPerCoulomb`
- `type Farads`
- `type ElectricFluxVoltsMetres`
- `type Teslas`
- `type Webers`
- `type WebersPerSecond`
- `type SquareMetres`
- `type Ohms`
- `type Amps`
- `type VoltsPerMetre`
- `type RadiansPerMetre`
- `type WattsPerSquareMetre`
- `type JoulesPerCubicMetre`
- `type PointChargeElectricFieldInput`
- `type PointChargePotentialInput`
- `type ElectricForceInput`
- `type ElectricPotentialEnergyInput`
- `type PointChargeModelInput`
- `type PointChargeModel`
- `type ParallelPlateCapacitorInput`
- `type ParallelPlateCapacitorModel`
- `type ElectricFluxThroughSurfaceInput`
- `type ElectricFluxFromChargeInput`
- `type EnclosedChargeFromFluxInput`
- `type GaussLawSymmetricFieldInput`
- `type GaussLawSymmetricFieldModel`
- `LenzOpposition = "oppose-increase" | "oppose-decrease" | "no-change"`
- `type UniformFluxInductionInput`
- `type UniformFluxInductionModel`
- `type ElectromagneticWaveInput`
- `type ElectromagneticWaveModel`
- `coulombs(value: number): Coulombs`
- `coulombsPerMetre(value: number): CoulombsPerMetre`
- `coulombsPerSquareMetre(value: number): CoulombsPerSquareMetre`
- `volts(value: number): Volts`
- `newtonsPerCoulomb(value: number): NewtonsPerCoulomb`
- `farads(value: number): Farads`
- `electricFluxVoltsMetres(value: number): ElectricFluxVoltsMetres`
- `teslas(value: number): Teslas`
- `webers(value: number): Webers`
- `webersPerSecond(value: number): WebersPerSecond`
- `squareMetres(value: number): SquareMetres`
- `ohms(value: number): Ohms`
- `amps(value: number): Amps`
- `voltsPerMetre(value: number): VoltsPerMetre`
- `radiansPerMetre(value: number): RadiansPerMetre`
- `wattsPerSquareMetre(value: number): WattsPerSquareMetre`
- `joulesPerCubicMetre(value: number): JoulesPerCubicMetre`
- `pointChargeElectricField(input: PointChargeElectricFieldInput): KernelResult<Vector2>`
- `pointChargeElectricPotential(input: PointChargePotentialInput): KernelResult<Volts>`
- `electricForceOnCharge(input: ElectricForceInput): KernelResult<Vector2>`
- `electricPotentialEnergy(input: ElectricPotentialEnergyInput): KernelResult<Joules>`
- `pointChargeModel(input: PointChargeModelInput): KernelResult<PointChargeModel>`
- `parallelPlateCapacitorModel(input: ParallelPlateCapacitorInput): KernelResult<ParallelPlateCapacitorModel>`
- `electricFluxThroughSurface(input: ElectricFluxThroughSurfaceInput): KernelResult<ElectricFluxVoltsMetres>`
- `electricFluxFromEnclosedCharge(input: ElectricFluxFromChargeInput): KernelResult<ElectricFluxVoltsMetres>`
- `enclosedChargeFromElectricFlux(input: EnclosedChargeFromFluxInput): KernelResult<Coulombs>`
- `gaussLawSymmetricFieldModel(input: GaussLawSymmetricFieldInput): KernelResult<GaussLawSymmetricFieldModel>`
- `uniformFluxInductionModel(input: UniformFluxInductionInput): KernelResult<UniformFluxInductionModel>`
- `electromagneticWaveModel(input: ElectromagneticWaveInput): KernelResult<ElectromagneticWaveModel>`

## Invariants the caller must preserve
- All numeric inputs are SI values: C, m, N/C, V, J.
- `pointMetres` is the vector from the source charge to the field point.
- `minRadiusMetres`, when supplied, must be finite and non-negative.
- Point-charge field and potential are undefined at the source. Callers may
  supply `minRadiusMetres` to clamp a near-source display to zero field.
- Parallel-plate capacitor inputs use SI values: m^2, m, V, F, C, J, V/m, and
  J/m^3. Plate area, plate separation, and dielectric constant must be positive.
- Gauss-law helpers use SI values: C, C/m, C/m^2, m, m^2, V/m, and V m.
- `electricFluxThroughSurface` uses an angle to the surface normal constrained
  to 0 through 180 degrees so flux sign is explicit.
- `gaussLawSymmetricFieldModel` only accepts the implemented ideal symmetries:
  spherical, cylindrical, and planar. Required radii, lengths, and Gaussian
  surface areas must be finite and positive.
- Uniform-flux induction inputs use SI values: T, m^2, s, ohm, Wb, V, A.
- `angleToNormalDegrees` is the angle between magnetic field and the loop normal,
  constrained to 0 through 90 degrees.
- `uniformFluxInductionModel` uses the sign convention `emf = -N Delta Phi / Delta t`.
- Electromagnetic-wave inputs use positive finite frequency, electric-field
  amplitude, relative permittivity, and relative permeability.

## What this module does NOT do
- Does **not** render field lines, vector plots, charges, or apparatus.
- Does **not** model distributed charges beyond ideal spherical, cylindrical,
  planar, and parallel-plate Gaussian approximations; arbitrary magnetic fields;
  moving conductors; self-inductance; mutual inductance; eddy currents;
  transformers; circuits beyond simple capacitor/induced-current readouts;
  dielectric breakdown; nonlinear dielectrics; relativity; dispersive material
  response; or nonlinear optical effects.
- Does **not** know about A-Level or SUTD branch-specific conventions.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/electromagnetism` when a simulation needs shared point-charge
calculations for `E = kQ/r^2`, `F = qE`, `V = kQ/r`, or `U = qV`; ideal
parallel-plate capacitor calculations for `C = kappa epsilon_0 A / d`,
`Q = CV`, `U = 1/2 CV^2`, and `E = V/d`; ideal Gauss-law calculations for
`Phi_E = EA cos(theta)`, `Phi_E = Q_enclosed / epsilon_0`,
`E_sphere = Q / (4 pi epsilon_0 r^2)`,
`E_cylinder = lambda / (2 pi epsilon_0 r)`, or
`E_plane = sigma / (2 epsilon_0)`; an ideal Faraday-Lenz readout for
`Phi = BA cos(theta)` and `emf = -N Delta Phi / Delta t`; or
electromagnetic-wave calculations for `v = c / sqrt(epsilon_r mu_r)`,
`lambda = v / f`, and `B_0 = E_0 / v`. If a sim is about to inline those
formulae, use this module instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every consuming electromagnetism sim.
2. Add property tests for every new physical invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` instead of `KernelResult.err(...)`.
- Mixing centimetres, microcoulombs, nanocoulombs, or degrees into public inputs.
- Adding branch-specific constants or syllabus flags.
- Mutating vectors or arrays supplied by callers.
- Adding a physics engine dependency for closed-form point-charge, uniform
  flux induction, parallel-plate capacitor, Gauss-law symmetry, or
  electromagnetic-wave formulae.

## How the Anieyrudh Filter reads this module
The Filter checks that electric-field visuals make the same quantitative claims
as this kernel. A field arrow, force arrow, potential readout, or energy
calculation whose displayed values disagree with these functions beyond
`electromagnetismTolerance` is rejected.
