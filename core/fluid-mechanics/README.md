# @paideia/fluid-mechanics

Deterministic introductory fluid-mechanics calculations for Paideia
simulations.

Use this package when a sim needs shared numbers for Reynolds number,
hydrostatics, buoyancy, continuity, Bernoulli pressure changes, pipe head loss,
drag force, Hagen-Poiseuille pipe flow, plane-Couette shear, Stokes drag,
capillary rise, or Peclet number. Rendering belongs in the consuming simulation
or a visual kernel such as `core/charting` or `core/plotting`.

## Example

```ts
import { metres, metresPerSecond } from "@paideia/shared";
import {
  kilogramsPerCubicMetre,
  pascalSeconds,
  pascals,
  poiseuillePipeFlow,
  reynoldsNumber,
} from "@paideia/fluid-mechanics";

const re = reynoldsNumber({
  densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(998),
  velocityMetresPerSecond: metresPerSecond(2),
  characteristicLengthMetres: metres(0.05),
  dynamicViscosityPascalSeconds: pascalSeconds(0.001),
});

const microChannel = poiseuillePipeFlow({
  pressureDropPascals: pascals(1_000),
  pipeRadiusMetres: metres(0.001),
  pipeLengthMetres: metres(0.1),
  dynamicViscosityPascalSeconds: pascalSeconds(0.001),
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero
viscosity or negative depth, return `err(...)` rather than throwing.

## Scope

This package models scalar introductory fluid calculations. It does not model
CFD, compressible flow, turbulence spectra, pumps, cavitation, water hammer,
free-surface waves, pipe networks, non-Newtonian fluids, electro-osmosis, or
microfluidic droplet breakup.
