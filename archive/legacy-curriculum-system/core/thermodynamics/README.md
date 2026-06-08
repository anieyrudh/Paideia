# @paideia/thermodynamics

Deterministic thermodynamics calculations for Paideia simulations.

Use this package when a sim needs shared numbers for Kelvin conversion,
ideal-gas pressure or volume, heat transfer, pressure-volume traces, or simple
engine efficiency. Rendering belongs in the consuming simulation or a visual
kernel such as `core/charting`.

## Example

```ts
import { kelvins, kilograms } from "@paideia/shared";
import {
  cubicMetres,
  heatTransfer,
  idealGasPressure,
  joulesPerKilogramKelvin,
  moles,
} from "@paideia/thermodynamics";

const pressure = idealGasPressure({
  amountMoles: moles(0.04),
  temperatureKelvins: kelvins(300.15),
  volumeCubicMetres: cubicMetres(0.001),
});

const energy = heatTransfer({
  massKilograms: kilograms(0.25),
  specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
  initialTemperatureKelvins: kelvins(293.15),
  finalTemperatureKelvins: kelvins(333.15),
});
```

Both calls return `KernelResult` values. Expected invalid inputs, such as
negative absolute temperature or zero gas volume, return `err(...)` rather than
throwing.

## Scope

This package models ideal gas behaviour, sensible heat transfer, and simple
efficiency bounds. It does not model real gases, phase changes, conduction,
convection, radiation, entropy, or full thermodynamic cycles.
