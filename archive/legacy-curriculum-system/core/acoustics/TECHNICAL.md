# Acoustics · Technical Record

## Public Interface Summary

`@paideia/acoustics` exports branded sound-intensity values plus pure helpers
for:

- `soundSpeed`
- `wavelengthFromSpeed`
- `frequencyFromSpeed`
- `soundIntensityLevel`
- `intensityFromLevel`
- `beatFrequency`
- `dopplerShift`
- `resonanceTubeMode`

The package owns first-year acoustics calculations and leaves generic wave
sampling to `@paideia/waves`.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Frequency, wavelength, speed, intensity, and tube length are positive | `positiveFinite` and `soundIntensity` return `out-of-domain` |
| Signed Doppler velocities are finite | `finite` guard returns `out-of-domain` |
| Doppler denominator remains positive | `dopplerShift` returns `out-of-domain` |
| Resonance mode numbers are positive integers | `resonanceTubeMode` returns `precondition-violated` |
| End correction is finite and non-negative | `nonNegativeFinite` returns `out-of-domain` |
| Overflow is not silently rendered | Derived-value guards return `numerical-instability` |
| Caller-owned inputs are not mutated | Outputs are newly constructed and frozen |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No audio, FFT, rendering, media, or GPL-family runtime dependencies are
  bundled.

## Test Strategy

- Happy paths cover sound speed, wavelength/frequency conversion, dB level,
  inverse intensity recovery, beats, Doppler, and resonance-tube modes.
- Error paths cover `out-of-domain`, `precondition-violated`, and
  `numerical-instability`.
- Property-style checks verify Doppler monotonicity and observed frequency
  consistency with the frequency ratio.
- Immutability is supported by frozen result records.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could sprawl into audio synthesis, spectrograms, room acoustics, or
  instrument simulation. Resolved by limiting the package to closed-form
  first-year acoustics calculations.
- Doppler denominator and decibel conversions could leak `NaN` or `Infinity`.
  Resolved through `KernelResult.err` guards and overflow checks.

### P1 issues

- Acoustics overlaps with `@paideia/waves`. Resolved by keeping generic wave
  traces and superposition in `@paideia/waves`; this package owns sound-specific
  readouts.
- Doppler sign conventions can be ambiguous. Resolved by documenting one-axis
  velocity signs in the contract.

### High-bandwidth questions surfaced

- If a future container needs waveform rendering or audio playback, that should
  be a renderer/runtime package, not a core acoustics dependency.

## P2 Followups

- Add harmonic series helpers for strings or air columns only when a container
  needs instrument-mode comparisons.
- Add logarithmic addition of independent sound levels only through a separate
  contract if a queue item needs multi-source sound intensity.
