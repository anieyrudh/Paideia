# @paideia/heat-transfer

Deterministic steady-state heat-transfer calculations for Paideia simulations.

Use this package when a sim needs shared numbers for conduction, convection,
radiation, U-values, thermal resistance, direct solar heat gain, or a simple
gain/loss heat balance. Rendering belongs in the consuming simulation or a
visual kernel such as `core/charting`.

## Example

```ts
import { kelvins, metres } from "@paideia/shared";
import {
  conductionHeatRate,
  squareMetres,
  wattsPerMetreKelvin,
} from "@paideia/heat-transfer";

const wallLoss = conductionHeatRate({
  thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(0.8),
  areaSquareMetres: squareMetres(10),
  thicknessMetres: metres(0.2),
  hotTemperatureKelvins: kelvins(303),
  coldTemperatureKelvins: kelvins(293),
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero
thickness or an emissivity outside `[0, 1]`, return `err(...)` rather than
throwing.

## Scope

This package models steady-state scalar heat-transfer helpers. It does not
model transient heat equations, CFD, daylight, thermal comfort, climate files,
moisture, HVAC controls, or Radiance/EnergyPlus-style simulation.
