# core/heat-transfer · agent contract

## What this module is
The deterministic heat-transfer kernel for Paideia simulations. It owns
steady-state conduction, convection, thermal radiation, series thermal
resistance, U-value, and direct solar heat-gain helpers in SI units. It is pure
TypeScript and returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/heat-transfer`:

- `stefanBoltzmannConstantWattsPerSquareMetreKelvinFourth: WattsPerSquareMetreKelvinFourth`
- `heatTransferTolerance: { default: number; tight: number; loose: number }`
- `type SquareMetres`
- `type MetresSquaredKelvinsPerWatt`
- `type WattsPerMetreKelvin`
- `type WattsPerSquareMetreKelvin`
- `type WattsPerSquareMetre`
- `type WattsPerSquareMetreKelvinFourth`
- `type Emissivity`
- `type SolarHeatGainCoefficient`
- `type ShadedFraction`
- `type ConductionHeatRateInput`
- `type ConvectionHeatRateInput`
- `type RadiationHeatRateInput`
- `type ThermalResistanceLayer`
- `type ThermalResistanceResult`
- `type UValueInput`
- `type SolarHeatGainInput`
- `type HeatBalanceInput`
- `type HeatBalanceResult`
- `squareMetres(value: number): SquareMetres`
- `metresSquaredKelvinsPerWatt(value: number): MetresSquaredKelvinsPerWatt`
- `wattsPerMetreKelvin(value: number): WattsPerMetreKelvin`
- `wattsPerSquareMetreKelvin(value: number): WattsPerSquareMetreKelvin`
- `wattsPerSquareMetre(value: number): WattsPerSquareMetre`
- `wattsPerSquareMetreKelvinFourth(value: number): WattsPerSquareMetreKelvinFourth`
- `emissivity(value: number): KernelResult<Emissivity>`
- `solarHeatGainCoefficient(value: number): KernelResult<SolarHeatGainCoefficient>`
- `shadedFraction(value: number): KernelResult<ShadedFraction>`
- `conductionHeatRate(input: ConductionHeatRateInput): KernelResult<Watts>`
- `convectionHeatRate(input: ConvectionHeatRateInput): KernelResult<Watts>`
- `radiationHeatRate(input: RadiationHeatRateInput): KernelResult<Watts>`
- `seriesThermalResistance(layers: readonly ThermalResistanceLayer[]): KernelResult<ThermalResistanceResult>`
- `uValue(input: UValueInput): KernelResult<WattsPerSquareMetreKelvin>`
- `solarHeatGain(input: SolarHeatGainInput): KernelResult<Watts>`
- `netHeatBalance(input: HeatBalanceInput): KernelResult<HeatBalanceResult>`

## Invariants the caller must preserve
- Public physical quantities use SI units: W, m, m^2, K, W m^-1 K^-1, W m^-2
  K^-1, W m^-2, and m^2 K W^-1.
- Areas, thicknesses, conductivities, heat-transfer coefficients, irradiance,
  and resistances must be finite and non-negative unless a denominator requires
  strict positivity.
- Emissivity, solar heat-gain coefficient, and shaded fraction are
  dimensionless values in `[0, 1]`.
- Radiation temperatures are absolute kelvin temperatures.
- Positive heat rate means heat flow in the direction implied by the input
  labels: hot-to-cold for conduction/convection/radiation and into the zone for
  solar heat gain.

## What this module does NOT do
- Does **not** render facade diagrams, heat maps, daylight, or thermal comfort.
- Does **not** model transient heat equations, CFD, moisture, HVAC controls,
  view factors, spectral radiation, or Radiance/EnergyPlus-style simulation.
- Does **not** hide A-Level or SUTD presets, materials catalogues, climate
  files, or branch flags.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/heat-transfer` when a simulation is about to inline `q = kA DeltaT /
L`, `q = hA DeltaT`, `q = epsilon sigma A (T_hot^4 - T_cold^4)`, `U = 1 / R`,
or direct solar heat gain `q = A I SHGC exposure (1 - shaded fraction)`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current heat-transfer sim.
2. Add property tests for every new monotonicity, conservation, or bounds
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing Celsius, square feet, BTU, hours, or local climate units into public
  inputs.
- Adding branch-specific material presets or climate assumptions.
- Mutating layer arrays supplied by callers.
- Adding a renderer, solver, or external simulation engine dependency.

## How the Anieyrudh Filter reads this module
The Filter checks that facade, shading, and thermal-envelope visuals make the
same quantitative claims as this kernel. A heat-gain card, U-value readout, or
radiation/convection/conduction calculation whose displayed values disagree
with these functions beyond `heatTransferTolerance.default` is rejected.
