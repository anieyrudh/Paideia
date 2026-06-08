# core/thermodynamics · agent contract

## What this module is
The deterministic thermodynamics kernel for Paideia simulations. It owns
absolute-temperature conversion, ideal-gas calculations, heat-transfer
calculations, pressure-volume traces, and simple heat-engine efficiency
helpers in SI units. It is pure TypeScript and returns `KernelResult` values
for expected invalid inputs.

## Public interface
Exports from `@paideia/thermodynamics`:

- `idealGasConstantJoulesPerMoleKelvin: JoulesPerMoleKelvin`
- `thermodynamicsTolerance: { default: number; tight: number; loose: number }`
- `type Celsius`
- `type Moles`
- `type Pascals`
- `type CubicMetres`
- `type JoulesPerKilogramKelvin`
- `type JoulesPerMoleKelvin`
- `type TemperatureDeltaKelvins`
- `type InverseCubicMetres`
- `type ThermalEfficiency`
- `type IdealGasPressureInput`
- `type IdealGasVolumeInput`
- `type IdealGasState`
- `type HeatTransferInput`
- `type HeatTransferResult`
- `type PressureVolumeTraceInput`
- `type PressureVolumeTracePoint`
- `type ThermalEfficiencyInput`
- `type CarnotEfficiencyInput`
- `celsius(value: number): Celsius`
- `moles(value: number): Moles`
- `pascals(value: number): Pascals`
- `cubicMetres(value: number): CubicMetres`
- `joulesPerKilogramKelvin(value: number): JoulesPerKilogramKelvin`
- `joulesPerMoleKelvin(value: number): JoulesPerMoleKelvin`
- `temperatureDeltaKelvins(value: number): TemperatureDeltaKelvins`
- `inverseCubicMetres(value: number): InverseCubicMetres`
- `thermalEfficiency(value: number): KernelResult<ThermalEfficiency>`
- `kelvinFromCelsius(temperatureCelsius: Celsius): KernelResult<Kelvins>`
- `celsiusFromKelvin(temperatureKelvins: Kelvins): KernelResult<Celsius>`
- `idealGasPressure(input: IdealGasPressureInput): KernelResult<Pascals>`
- `idealGasVolume(input: IdealGasVolumeInput): KernelResult<CubicMetres>`
- `idealGasState(input: IdealGasPressureInput): KernelResult<IdealGasState>`
- `heatTransfer(input: HeatTransferInput): KernelResult<HeatTransferResult>`
- `pressureVolumeTrace(input: PressureVolumeTraceInput): KernelResult<readonly PressureVolumeTracePoint[]>`
- `engineEfficiency(input: ThermalEfficiencyInput): KernelResult<ThermalEfficiency>`
- `carnotEfficiency(input: CarnotEfficiencyInput): KernelResult<ThermalEfficiency>`

## Invariants the caller must preserve
- Public physical quantities use SI units: mol, K, Pa, m^3, kg, J, and J kg^-1 K^-1.
- Celsius appears only at the conversion boundary. Gas laws and heat-engine
  calculations use kelvin.
- Ideal-gas amount, pressure, volume, and thermodynamic temperature must be
  finite and positive where used as denominators or physical state values.
- Heat-transfer mass must be finite and non-negative. Specific heat capacity
  must be finite and positive.
- Engine efficiency is dimensionless and must stay in `[0, 1]`.
- Pressure-volume traces are sampled at fixed amount and temperature.

## What this module does NOT do
- Does **not** render pistons, molecules, PV diagrams, heat flows, or engines.
- Does **not** model real-gas corrections, phase changes, conduction,
  convection, radiation, entropy, or thermodynamic cycles beyond Carnot
  efficiency.
- Does **not** hide A-Level or SUTD presets, exam constants, or branch flags.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/thermodynamics` when a simulation is about to inline `T_K = T_C +
273.15`, `pV = nRT`, `Q = mc Delta T`, `eta = W_out / Q_in`, or `eta_Carnot =
1 - T_cold / T_hot`. If the display needs a pressure-volume curve for a fixed
amount of gas and temperature, use `pressureVolumeTrace` rather than local
loop math.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current thermodynamics sim.
2. Add property tests for every new conservation, monotonicity, or bounds
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Substituting Celsius directly into gas-law or heat-engine calculations.
- Mixing litres, kilopascals, grams, or Celsius into public gas-law inputs.
- Adding branch-specific constants or syllabus flags.
- Mutating trace arrays supplied to, or returned from, callers.
- Adding a rendering dependency to this pure kernel.

## How the Anieyrudh Filter reads this module
The Filter checks that thermal visuals make the same quantitative claims as
this kernel. A gas-law pressure readout, PV trace, heat-transfer calculation,
or efficiency readout whose displayed values disagree with these functions
beyond `thermodynamicsTolerance.default` is rejected.
