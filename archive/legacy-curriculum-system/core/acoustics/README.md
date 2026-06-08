# @paideia/acoustics

Reusable acoustics helpers for Paideia containers. The kernel covers
sound-wave speed, frequency, wavelength, decibel intensity level, beats, simple
one-axis Doppler shifts, and open/closed resonance-tube modes.

It is not an audio synthesizer, spectrogram tool, room-acoustics model, or
instrument simulator.

## Example

```ts
import { hertz, metres } from "@paideia/shared";
import { soundSpeed } from "@paideia/acoustics";

const result = soundSpeed({
  frequencyHertz: hertz(440),
  wavelengthMetres: metres(0.78),
});

if (result.ok) {
  console.log(result.value.speedMetresPerSecond);
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
