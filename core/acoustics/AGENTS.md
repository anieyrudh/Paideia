# core/acoustics - agent contract

## What this module is

Pure first-year acoustics kernels for teaching sound-wave kinematics, intensity
level in decibels, beats, simple Doppler shifts, and resonance-tube modes. It
returns deterministic numbers and readonly records only; audio synthesis,
spectrograms, room acoustics, instrument timbre, and learner controls live
elsewhere.

## Public interface

Exports from `@paideia/acoustics`:

- `acousticsTolerance: { default: number; tight: number; loose: number }`
- `SoundIntensity = Brand<number, "Acoustics.SoundIntensity">`
- `SoundSpeedInput = { frequencyHertz: Hertz; wavelengthMetres: Metres }`
- `SoundSpeedResult = { speedMetresPerSecond: MetresPerSecond; periodSeconds: Seconds }`
- `SoundIntensityLevelInput = { intensityWattsPerSquareMetre: SoundIntensity; referenceIntensityWattsPerSquareMetre?: SoundIntensity }`
- `SoundIntensityLevelResult = { levelDecibels: Decibels; intensityWattsPerSquareMetre: SoundIntensity; referenceIntensityWattsPerSquareMetre: SoundIntensity }`
- `BeatFrequencyInput = { frequencyAHertz: Hertz; frequencyBHertz: Hertz }`
- `BeatFrequencyResult = { beatFrequencyHertz: Hertz; averageFrequencyHertz: Hertz }`
- `DopplerInput = { sourceFrequencyHertz: Hertz; waveSpeedMetresPerSecond: MetresPerSecond; observerVelocityMetresPerSecond?: MetresPerSecond; sourceVelocityMetresPerSecond?: MetresPerSecond }`
- `DopplerResult = { observedFrequencyHertz: Hertz; frequencyRatio: number }`
- `ResonanceTubeKind = "open-open" | "closed-open"`
- `ResonanceTubeInput = { tubeLengthMetres: Metres; waveSpeedMetresPerSecond: MetresPerSecond; modeNumber: number; kind: ResonanceTubeKind; endCorrectionMetres?: Metres }`
- `ResonanceTubeResult = { kind: ResonanceTubeKind; modeNumber: number; effectiveLengthMetres: Metres; wavelengthMetres: Metres; frequencyHertz: Hertz }`
- `soundIntensity(value: number): KernelResult<SoundIntensity>`
- `soundSpeed(input: SoundSpeedInput): KernelResult<SoundSpeedResult>`
- `wavelengthFromSpeed(frequencyHertz: Hertz, speedMetresPerSecond: MetresPerSecond): KernelResult<Metres>`
- `frequencyFromSpeed(wavelengthMetres: Metres, speedMetresPerSecond: MetresPerSecond): KernelResult<Hertz>`
- `soundIntensityLevel(input: SoundIntensityLevelInput): KernelResult<SoundIntensityLevelResult>`
- `intensityFromLevel(levelDecibels: Decibels, referenceIntensityWattsPerSquareMetre?: SoundIntensity): KernelResult<SoundIntensity>`
- `beatFrequency(input: BeatFrequencyInput): KernelResult<BeatFrequencyResult>`
- `dopplerShift(input: DopplerInput): KernelResult<DopplerResult>`
- `resonanceTubeMode(input: ResonanceTubeInput): KernelResult<ResonanceTubeResult>`

## Invariants the caller must preserve

- Frequency, wavelength, sound speed, tube length, and sound intensity values
  are finite and positive unless a function explicitly documents signed
  velocity.
- Doppler velocities are signed along the source-to-observer axis: positive
  observer velocity moves toward the source; positive source velocity moves
  toward the observer.
- Doppler denominator `waveSpeed - sourceVelocity` must remain positive.
- Resonance tube mode numbers are positive integers. Closed-open tubes use odd
  harmonics internally from `modeNumber = 1, 2, 3, ...`.
- End correction, when supplied, is finite and non-negative.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not synthesize audio, generate waveforms, or play sound.
- Does not model damping, dispersion, room acoustics, psychoacoustics, or
  instrument timbre.
- Does not solve arbitrary boundary-condition systems or CFD.
- Does not import branch-specific sound speeds or exam presets.

## When to consider this module

Use `core/acoustics` when a sim needs sound speed/frequency/wavelength,
decibel intensity level, beat frequency, simple one-axis Doppler shift, or
open/closed resonance-tube frequencies. Use `core/waves` for generic wave
traces, superposition, standing-wave samples, or phase/path-difference
interference.

## Extension protocol

1. Open a `core-change-proposal` issue naming every consuming acoustics sim.
2. Add property tests for every new monotonicity, symmetry, or boundary
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing centimetres, milliseconds, degrees, or screen units into public inputs.
- Adding audio, FFT, media, or rendering dependencies to this pure kernel.
- Hiding branch-specific constants in the kernel.

## How the Anieyrudh Filter reads this module

The Filter checks that acoustics visuals make the same quantitative claims as
this kernel. A beat, Doppler, resonance tube, or decibel readout whose displayed
values disagree with these functions beyond `acousticsTolerance.default` is
rejected; the visual layer cannot quietly teach a different model.
