# @paideia/waves

Deterministic one-dimensional wave calculations for Paideia simulations.

Use this package when a sim needs shared numbers for wave speed, period,
sinusoidal displacement, traces, superposition, standing waves, beats, or
two-source interference. Rendering belongs in `core/plotting`, `core/charting`,
`core/three-scene`, or the consuming simulation.

## Example

```ts
import { hertz, metres, seconds } from "@paideia/shared";
import { transverseWaveTrace, waveKinematics } from "@paideia/waves";

const kinematics = waveKinematics({
  frequencyHertz: hertz(2),
  wavelengthMetres: metres(1.5),
});

const trace = transverseWaveTrace({
  amplitudeMetres: metres(0.2),
  frequencyHertz: hertz(2),
  wavelengthMetres: metres(1.5),
  startMetres: metres(0),
  endMetres: metres(3),
  timeSeconds: seconds(0.25),
  sampleCount: 128,
});
```

Both calls return `KernelResult` values. Expected invalid inputs, such as zero
wavelength or negative time, return `err(...)` rather than throwing.

## Scope

This package models ideal sinusoidal waves in one spatial dimension. It does
not model damping, dispersion, diffraction, nonlinear effects, audio synthesis,
or rendering.
