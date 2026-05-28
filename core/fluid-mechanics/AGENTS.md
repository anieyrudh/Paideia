# core/fluid-mechanics · agent contract

## What this module is
The deterministic fluid-mechanics kernel for Paideia simulations. It owns
introductory SI-unit calculations for Reynolds number, hydrostatic pressure,
buoyancy, continuity, Bernoulli pressure changes, Darcy-Weisbach pipe head
loss, drag force, and closed-form viscous/microfluidic teaching helpers. It is
pure TypeScript and returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/fluid-mechanics`:

- `standardGravityMetresPerSecondSquared: MetresPerSecondSquared`
- `fluidMechanicsTolerance: { default: number; tight: number; loose: number }`
- `type KilogramsPerCubicMetre`
- `type PascalSeconds`
- `type Pascals`
- `type SquareMetres`
- `type CubicMetres`
- `type CubicMetresPerSecond`
- `type MetresSquaredPerSecond`
- `type ReynoldsNumber`
- `type PecletNumber`
- `type PascalsPerCubicMetrePerSecond`
- `type PerSecond`
- `type RelativeRoughness`
- `type DarcyFrictionFactor`
- `type DragCoefficient`
- `type ReynoldsRegime`
- `type PecletRegime`
- `type ReynoldsNumberInput`
- `type HydrostaticPressureInput`
- `type BuoyantForceInput`
- `type ContinuityVelocityInput`
- `type BernoulliPressureInput`
- `type DarcyFrictionFactorInput`
- `type DarcyFrictionFactorResult`
- `type PipeHeadLossInput`
- `type DragForceInput`
- `type PoiseuillePipeFlowInput`
- `type PoiseuillePipeFlowResult`
- `type PlaneCouetteFlowInput`
- `type PlaneCouetteFlowResult`
- `type StokesDragInput`
- `type CapillaryRiseInput`
- `type PecletNumberInput`
- `kilogramsPerCubicMetre(value: number): KilogramsPerCubicMetre`
- `pascalSeconds(value: number): PascalSeconds`
- `pascals(value: number): Pascals`
- `squareMetres(value: number): SquareMetres`
- `cubicMetres(value: number): CubicMetres`
- `cubicMetresPerSecond(value: number): CubicMetresPerSecond`
- `metresSquaredPerSecond(value: number): MetresSquaredPerSecond`
- `surfaceTensionNewtonsPerMetre(value: number): NewtonsPerMetre`
- `relativeRoughness(value: number): KernelResult<RelativeRoughness>`
- `dragCoefficient(value: number): KernelResult<DragCoefficient>`
- `reynoldsNumber(input: ReynoldsNumberInput): KernelResult<ReynoldsNumber>`
- `classifyPipeFlow(reynoldsNumber: ReynoldsNumber): ReynoldsRegime`
- `hydrostaticGaugePressure(input: HydrostaticPressureInput): KernelResult<Pascals>`
- `buoyantForce(input: BuoyantForceInput): KernelResult<Newtons>`
- `continuityVelocity(input: ContinuityVelocityInput): KernelResult<MetresPerSecond>`
- `bernoulliPressureAtTarget(input: BernoulliPressureInput): KernelResult<Pascals>`
- `darcyFrictionFactor(input: DarcyFrictionFactorInput): KernelResult<DarcyFrictionFactorResult>`
- `pipeHeadLoss(input: PipeHeadLossInput): KernelResult<Metres>`
- `dragForce(input: DragForceInput): KernelResult<Newtons>`
- `poiseuillePipeFlow(input: PoiseuillePipeFlowInput): KernelResult<PoiseuillePipeFlowResult>`
- `planeCouetteFlow(input: PlaneCouetteFlowInput): KernelResult<PlaneCouetteFlowResult>`
- `stokesDragForce(input: StokesDragInput): KernelResult<Newtons>`
- `capillaryRiseHeight(input: CapillaryRiseInput): KernelResult<Metres>`
- `pecletNumber(input: PecletNumberInput): KernelResult<PecletNumber>`
- `classifyPecletTransport(pecletNumber: PecletNumber): PecletRegime`

## Invariants the caller must preserve
- Public physical quantities use SI units: kg m^-3, Pa s, Pa, m, m^2, m^3,
  m^3 s^-1, m^2 s^-1, m s^-1, m s^-2, N, N m^-1, and dimensionless ratios.
- Density, dynamic viscosity, length, area, diameter, friction factor, and drag
  coefficient are finite and positive where used as physical coefficients or
  denominators.
- Depth, elevation, roughness ratio, and displaced volume are finite and
  non-negative.
- Reynolds number and drag coefficient are dimensionless non-negative values.
- Peclet number is dimensionless and non-negative.
- Positive hydrostatic pressure is gauge pressure below a free surface.
- Positive buoyant force points upward; positive drag force is magnitude
  opposing relative motion.
- Poiseuille and Couette helpers assume steady laminar Newtonian flow with
  no-slip walls and scalar closed-form outputs only.
- Capillary rise uses Jurin's law and allows negative height for non-wetting
  contact angles above 90 degrees.

## What this module does NOT do
- Does **not** render streamlines, dye streaks, pressure maps, pipes, tanks,
  particles, or CFD meshes.
- Does **not** model compressible flow, turbulence spectra, Navier-Stokes
  solvers, free-surface waves, pumps, cavitation, water hammer, or microfluidic
  droplet breakup.
- Does **not** model CFD velocity fields, pressure maps, pipe networks,
  entrance effects, non-Newtonian fluids, slip flow, electro-osmosis, or
  particle-particle interactions.
- Does **not** hide A-Level, SUTD, climate, material, or device presets.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/fluid-mechanics` when a simulation is about to inline `Re = rho v L
/ mu`, `p = rho g h`, `F_b = rho g V`, `Q = Av`, Bernoulli pressure changes,
Darcy-Weisbach pipe losses, quadratic drag, Hagen-Poiseuille pipe flow,
plane-Couette shear, Stokes drag, Jurin capillary rise, or `Pe = v L / D`.
If the sim needs CFD visuals, compose those visuals around this kernel's scalar
claims rather than placing the formulas in the container.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current fluid-mechanics sim.
2. Add property tests for every new conservation, monotonicity, or bounds
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing litres, centimetres, bar, psi, cSt, hours, or imperial units into
  public kernel inputs.
- Adding branch-specific fluid/material presets or lab constants.
- Treating turbulent transition as an exact universal threshold outside the
  documented pipe-flow classifier.
- Adding a rendering dependency, CFD dependency, or external fluid-property
  database to this pure kernel.

## How the Anieyrudh Filter reads this module
The Filter checks that fluid visuals make the same quantitative claims as this
kernel. A Reynolds readout, buoyancy arrow, Bernoulli gauge, head-loss meter, or
drag-force display whose values disagree with these functions beyond
`fluidMechanicsTolerance.default` is rejected. The same rule applies to
Poiseuille flow-rate cards, Couette shear profiles, Stokes-force labels,
capillary-rise markers, and Peclet transport-regime indicators.
