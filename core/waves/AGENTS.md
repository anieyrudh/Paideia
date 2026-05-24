# core/waves · agent contract

## What this module is
The deterministic one-dimensional wave kernel for Paideia simulations. It owns
basic wave kinematics, sinusoidal transverse-wave samples, traces,
superposition, standing-wave samples, beats, phase difference, and two-source
interference intensity. It is pure TypeScript and returns `KernelResult` values
for expected invalid inputs.

## Public interface
Exports from `@paideia/waves`:

- `waveTolerance: { default: number; tight: number; loose: number }`
- `type RadiansPerMetre`
- `type RelativeIntensity`
- `type WaveDirection = "positive-x" | "negative-x"`
- `type WaveKinematicsInput`
- `type WaveKinematicsResult`
- `type WaveSampleInput`
- `type WaveSample`
- `type WaveTraceInput`
- `type WaveTracePoint`
- `type SuperpositionComponent`
- `type SuperpositionInput`
- `type SuperpositionSample`
- `type StandingWaveInput`
- `type BeatInput`
- `waveKinematics(input: WaveKinematicsInput): KernelResult<WaveKinematicsResult>`
- `transverseWaveAt(input: WaveSampleInput): KernelResult<WaveSample>`
- `transverseWaveTrace(input: WaveTraceInput): KernelResult<readonly WaveTracePoint[]>`
- `superposeAt(input: SuperpositionInput): KernelResult<SuperpositionSample>`
- `standingWaveAt(input: StandingWaveInput): KernelResult<WaveSample>`
- `beatsAt(input: BeatInput): KernelResult<WaveSample>`
- `phaseDifference(pathDifferenceMetres: Metres, wavelengthMetres: Metres): KernelResult<Radians>`
- `interferenceIntensity(amplitude1Metres: Metres, amplitude2Metres: Metres, phaseDifferenceRadians: Radians): KernelResult<RelativeIntensity>`

## Invariants the caller must preserve
- Public physical quantities use branded SI units from `@paideia/shared` or this
  package. Frequency is hertz, wavelength, position, amplitude, and displacement
  are metres, time is seconds, angles are radians, wave number is radians per
  metre, and interference intensity is a relative non-negative scalar.
- Frequency, wavelength, trace length, and trace sample counts must be finite
  and positive.
- Time inputs represent elapsed simulation time and must be finite and
  non-negative.
- `direction: "positive-x"` means phase `kx - omega t + phi`.
  `direction: "negative-x"` means phase `kx + omega t + phi`.
- Superposition components are all sampled at the same position and time.
  Arbitrary superposition has no single phase, so `superposeAt` returns only
  resultant displacement plus the sampled position and time.
- This module treats waves as ideal sinusoidal waves in one spatial dimension.

## What this module does NOT do
- Does **not** render waves, strings, water surfaces, sound, or interference
  diagrams.
- Does **not** model damping, dispersion, nonlinear waves, diffraction, or
  boundary-condition solvers.
- Does **not** solve PDEs or arbitrary wave equations.
- Does **not** synthesize audio or persist simulation state.
- Does **not** import branch-specific content or flags.

## When to consider this module
Use `core/waves` when a simulation needs canonical values for wave speed,
period, angular frequency, wave number, sinusoidal displacement, superposition,
standing waves, beats, or path-difference interference. If a sim is about to
inline `v = f lambda`, `T = 1/f`, `y = A sin(kx - omega t)`, or two-source
phase/intensity formulae, use this module instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer.
2. Add property tests for every new conservation, periodicity, or symmetry
   invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing degrees, centimetres, milliseconds, or arbitrary screen units into
  public inputs.
- Mutating component arrays supplied by callers.
- Adding a rendering or audio dependency to this pure kernel.
- Hiding branch-specific wave speeds or exam presets in the kernel.

## How the Anieyrudh Filter reads this module
The Filter checks that wave visuals make the same quantitative claims as this
kernel. A string trace, beat envelope, standing wave, or interference readout
whose displayed values disagree with these functions beyond
`waveTolerance.default` is rejected; the visual layer cannot quietly teach a
different model than the learner manipulated.
