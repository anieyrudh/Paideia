# @paideia/membrane-transport

Deterministic membrane biophysics primitives for Paideia simulations. Provides
the Nernst equilibrium potential for a single ion, the
Goldman-Hodgkin-Katz (GHK) resting membrane potential for a small set of
monovalent ions, and Fick's first-law steady membrane flux.

## Exports

- `Concentration`, `Permeability`, `Flux`, `IonCharge`, `Volts`
- `MonovalentIon`, `NernstInput`, `GoldmanInput`, `MembraneFluxInput`
- `GAS_CONSTANT`, `FARADAY_CONSTANT`, `BODY_TEMPERATURE_KELVIN`, `ROOM_TEMPERATURE_KELVIN`
- `concentration`, `permeability`, `ionCharge`, `volts`, `flux`
- `nernstPotential`
- `goldmanVoltage`
- `membraneFlux`

## Usage

```ts
import {
  BODY_TEMPERATURE_KELVIN,
  concentration,
  goldmanVoltage,
  ionCharge,
  nernstPotential,
  permeability,
} from "@paideia/membrane-transport";

// Equilibrium potential for potassium at body temperature.
const ek = nernstPotential({
  temperatureKelvin: BODY_TEMPERATURE_KELVIN,
  charge: ionCharge(1).value!,
  concentrationOutside: concentration(4).value!,
  concentrationInside: concentration(140).value!,
});
// ek.value approx -0.0947 V (or about -94.7 mV)

// Resting membrane potential from three monovalent ions.
const vm = goldmanVoltage({
  temperatureKelvin: BODY_TEMPERATURE_KELVIN,
  ions: [
    { name: "K",  charge:  1, permeability: permeability(1).value!,    concentrationOutside: concentration(4).value!,   concentrationInside: concentration(140).value! },
    { name: "Na", charge:  1, permeability: permeability(0.04).value!, concentrationOutside: concentration(145).value!, concentrationInside: concentration(12).value!  },
    { name: "Cl", charge: -1, permeability: permeability(0.45).value!, concentrationOutside: concentration(110).value!, concentrationInside: concentration(10).value!  },
  ],
});
// vm.value approx -0.07 V (a textbook resting membrane potential)
```

## Scope

This module owns the algebraic biophysics: Nernst, GHK (monovalent only), and
Fick's first-law steady flux. It deliberately does NOT cover Hodgkin-Huxley
gating dynamics, voltage- or ligand-gated channel kinetics, time-dependent
diffusion, multi-valent generalisations of GHK, or any UI. Each of those is a
separate kernel or out-of-scope.
