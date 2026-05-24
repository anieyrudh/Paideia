# @paideia/waves Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: wave sample and
composition types, `waveTolerance`, and pure kernel functions for kinematics,
transverse-wave sampling, traces, superposition, standing waves, beats, phase
difference, and two-source interference intensity.

## Numerical model

The kernel uses the standard one-dimensional sinusoidal model:

```text
y = A sin(kx - omega t + phi)
v = f lambda
T = 1 / f
omega = 2 pi f
k = 2 pi / lambda
```

`direction: "negative-x"` flips the temporal sign so phase becomes
`kx + omega t + phi`. Standing waves use the ideal equal-amplitude
counter-propagating form `2A sin(kx) cos(omega t + phi)`.

Public physical quantities are branded at the API boundary. Amplitude and
displacement are metres, wave number is `RadiansPerMetre`, and two-source
interference returns a `RelativeIntensity`. Arbitrary superposition returns
`SuperpositionSample`, not `WaveSample`, because it has no single meaningful
phase angle after independent components are summed.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Frequency and wavelength are positive finite SI values | `validateKinematicsInput` returns `precondition-violated` |
| Time is finite and non-negative | `validatePositionAndTime` and `nonNegative` |
| Amplitude and phase are finite | `validateAmplitude` and `finite` |
| Trace sample count is bounded | `transverseWaveTrace` enforces `2..20001` |
| Trace start and end are distinct | `transverseWaveTrace` rejects zero trace length |
| Component arrays are not mutated | Functions read components and create new output objects |
| Arbitrary superposition has no fake phase | `superposeAt` returns `SuperpositionSample` without `phaseRadians` |
| Public quantities use unit-bearing types | `Metres`, `Hertz`, `Seconds`, `Radians`, `RadiansPerMetre`, and `RelativeIntensity` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers kinematics, invalid inputs, direction-aware phase,
trace sampling, readonly trace output, superposition, standing-wave nodes,
beats, phase difference, interference intensity, and property tests for
`v = f lambda` plus identical-wave superposition.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add damped and dispersive wave kernels after a concrete container requires
  them.
- Add acoustic decibel helpers in a separate acoustics kernel rather than
  expanding this ideal-wave API silently.
- Add wave-packet helpers only after deciding whether they belong here or in
  `core/numerical-math`.
- Add explicit error-path tests for empty superposition components, invalid
  beat frequency, invalid phase offsets, invalid phase-difference wavelength,
  and overflow-derived `numerical-instability`.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency.
- P1 issues checked: public API is deliberately narrow, all errors return
  `KernelResult.err`, unit-bearing public quantities are used for physical
  values, and arbitrary superposition does not invent a phase value.
- High-bandwidth questions surfaced: damping, diffraction, acoustic intensity,
  and wave packets are intentionally deferred until their first consuming
  container defines the required contract.
- Outcome: the kernel provides canonical numbers for wave visuals; any string
  trace, beat envelope, standing-wave diagram, or interference readout that
  diverges from these functions should fail review.
