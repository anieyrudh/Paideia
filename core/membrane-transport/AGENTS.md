# core/membrane-transport · agent contract

## What this module is

The deterministic membrane biophysics kernel for Paideia simulations: the
Nernst equation, the Goldman-Hodgkin-Katz (GHK) voltage equation, and Fick's
first-law membrane flux. It owns the recurring electrochemistry behind the
cell-structure-and-the-membrane, signal-pathway, and neuron-physiology
containers so sims do not hand-roll the gas-constant arithmetic or the GHK
ratio assembly.

## Public interface

Exports from `@paideia/membrane-transport`:

- `type Concentration` — branded number, millimolar (mM, equivalently mol/m^3).
- `type Permeability` — branded number, metres per second (m/s).
- `type Flux` — branded number, moles per square metre per second (mol/(m^2 s)).
- `type IonCharge` — branded non-zero integer, dimensionless.
- `type Volts` — branded number, volts (re-exported from `@paideia/shared` for convenience? No: see notes below; we use a local brand named `Volts` because shared does not currently define it).
- `type MonovalentIon` — `{ name: string; charge: -1 | 1; permeability: Permeability; concentrationOutside: Concentration; concentrationInside: Concentration }`.
- `type NernstInput` — `{ temperatureKelvin: Kelvins; charge: IonCharge; concentrationOutside: Concentration; concentrationInside: Concentration }`.
- `type GoldmanInput` — `{ temperatureKelvin: Kelvins; ions: ReadonlyArray<MonovalentIon> }`.
- `type MembraneFluxInput` — `{ permeability: Permeability; concentrationOutside: Concentration; concentrationInside: Concentration }`.
- `GAS_CONSTANT` — CODATA 2018 value, 8.314462618 J/(mol K), readonly.
- `FARADAY_CONSTANT` — CODATA 2018 value, 96485.33212 C/mol, readonly.
- `BODY_TEMPERATURE_KELVIN` — 310.15 K (37 degC), readonly.
- `ROOM_TEMPERATURE_KELVIN` — 298.15 K (25 degC), readonly.
- `concentration(value: number): KernelResult<Concentration>` — accepts positive finite mM.
- `permeability(value: number): KernelResult<Permeability>` — accepts non-negative finite m/s.
- `ionCharge(value: number): KernelResult<IonCharge>` — accepts non-zero integers.
- `volts(value: number): KernelResult<Volts>` — accepts finite values.
- `flux(value: number): KernelResult<Flux>` — accepts finite values.
- `nernstPotential(input: NernstInput): KernelResult<Volts>` — returns `E = (R T / z F) ln(C_out / C_in)` in volts.
- `goldmanVoltage(input: GoldmanInput): KernelResult<Volts>` — returns the resting membrane potential for a list of monovalent ions using the standard GHK form. Requires at least one ion with strictly positive permeability and strictly positive concentrations on both sides.
- `membraneFlux(input: MembraneFluxInput): KernelResult<Flux>` — returns `J = P (C_out - C_in)` in mol/(m^2 s). Sign convention: positive flux is outside-to-inside.

## Invariants the caller must preserve

- Concentrations are strictly positive finite numbers in mM. Zero concentration
  is rejected because the Nernst / GHK logarithm is undefined there.
- Permeabilities are non-negative finite numbers in m/s. Zero is allowed (an
  impermeable ion drops out of the GHK sum) but negative values are rejected.
- `IonCharge` is a non-zero integer. The Nernst function accepts any non-zero
  integer charge (e.g. +2 for Ca2+); GHK is restricted to +/- 1 because the
  full multi-valent GHK form is not in scope here.
- Temperatures are strictly positive (greater than the absolute-zero limit) in
  Kelvin. Negative or zero temperatures return `out-of-domain`.
- All results are revalidated for finiteness; underflow, overflow, or NaN
  produce `numerical-instability`.

## What this module does NOT do

- Does **not** integrate Hodgkin-Huxley action-potential dynamics. That belongs
  in a separate kernel (likely `core/signal-pathway` or a future
  `core/neuron-dynamics`).
- Does **not** model voltage-gated channels, time-dependent gating, or
  capacitive currents. It computes equilibrium / resting potentials and steady
  diffusive flux only.
- Does **not** expose the multi-valent (Pickard or Mullins-Noda) generalisation
  of GHK. Only monovalent cations and anions are supported in `goldmanVoltage`.
- Does **not** unit-check concentrations against ionic-strength bounds, pH, or
  activity coefficients.
- Does **not** render anything.

## When to consider this module

Use `core/membrane-transport` when a sim needs the Nernst equilibrium potential
for one ion, the resting membrane potential for a small set of monovalent ions
via GHK, or Fick's first-law steady flux across a membrane. If a container is
about to inline `(R T / F) ln(...)`, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change that:
   - alters the physical-constant values,
   - changes the sign convention of `membraneFlux`,
   - changes the brand identity of any exported type,
   - widens `goldmanVoltage` to multi-valent ions.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures
  instead of `KernelResult.err(...)`.
- Hidden floating-point comparisons that silently treat near-zero
  concentrations as valid.
- Importing a third-party CRAN-style electrochemistry library; the standard
  equations are short enough to write inline against `Math.log` and `Math.exp`.
- Adding alternative temperature conventions (Celsius, Fahrenheit) to the
  public API; callers brand units at the boundary.
