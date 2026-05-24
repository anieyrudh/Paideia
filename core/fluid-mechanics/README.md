# @paideia/fluid-mechanics

Deterministic introductory fluid-mechanics calculations for Paideia
simulations.

Use this package when a sim needs shared numbers for Reynolds number,
hydrostatics, buoyancy, continuity, Bernoulli pressure changes, pipe head loss,
or drag force. Rendering belongs in the consuming simulation or a visual kernel
such as `core/charting` or `core/plotting`.

## Example

```ts
import { metres, metresPerSecond } from "@paideia/shared";
import {
  kilogramsPerCubicMetre,
  pascalSeconds,
  reynoldsNumber,
} from "@paideia/fluid-mechanics";

const re = reynoldsNumber({
  densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(998),
  velocityMetresPerSecond: metresPerSecond(2),
  characteristicLengthMetres: metres(0.05),
  dynamicViscosityPascalSeconds: pascalSeconds(0.001),
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero
viscosity or negative depth, return `err(...)` rather than throwing.

## Scope

This package models scalar introductory fluid calculations. It does not model
CFD, compressible flow, turbulence spectra, pumps, cavitation, water hammer,
free-surface waves, or microfluidic droplet breakup.
