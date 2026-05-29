# core/daylight-geometry - agent contract

## What this module is

Pure daylight-geometry kernels for teaching approximate solar altitude,
azimuth, shadow length, and vertical-window sun-path samples. It returns
deterministic numbers and readonly records only; weather data, annual energy
simulation, timezone lookup, glare metrics, and rendering live elsewhere.

## Public interface

Exports from `@paideia/daylight-geometry`:

- `daylightGeometryTolerance: { default: number; tight: number; loose: number }`
- `DayOfYear = Brand<number, "DaylightGeometry.DayOfYear">`
- `SolarTimeHours = Brand<number, "DaylightGeometry.SolarTimeHours">`
- `SolarPositionInput = { latitudeRadians: Radians; dayOfYear: DayOfYear; solarTimeHours: SolarTimeHours }`
- `SolarPosition = { altitudeRadians: Radians; azimuthRadians: Radians; declinationRadians: Radians; hourAngleRadians: Radians; daylight: boolean }`
- `ShadowInput = SolarPositionInput & { objectHeightMetres: Metres }`
- `ShadowResult = { lengthMetres?: Metres; directionAzimuthRadians: Radians; daylight: boolean }`
- `WindowSunPathInput = { latitudeRadians: Radians; dayOfYear: DayOfYear; windowAzimuthRadians: Radians; startSolarTimeHours: SolarTimeHours; endSolarTimeHours: SolarTimeHours; sampleCount: number }`
- `WindowSunPathSample = SolarPosition & { solarTimeHours: SolarTimeHours; incidenceCosine: number; sunInFrontOfWindow: boolean }`
- `dayOfYear(value: number): KernelResult<DayOfYear>`
- `solarTimeHours(value: number): KernelResult<SolarTimeHours>`
- `solarDeclination(day: DayOfYear): KernelResult<Radians>`
- `solarPosition(input: SolarPositionInput): KernelResult<SolarPosition>`
- `shadowLength(input: ShadowInput): KernelResult<ShadowResult>`
- `windowSunPath(input: WindowSunPathInput): KernelResult<readonly WindowSunPathSample[]>`

## Invariants the caller must preserve

- Latitude is finite radians in `[-pi / 2, pi / 2]`.
- Azimuth inputs are finite radians and use north-clockwise convention.
- Day of year is an integer from `1` to `366`.
- Solar time is finite hours in `[0, 24]`.
- Shadow object height is finite and non-negative metres.
- Window sun-path sample count is an integer `>= 2`, and start time is not
  after end time.
- The solar-position approximation is educational and deterministic, not an
  astronomical ephemeris.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not compute civil time, time zones, longitude correction, or equation of
  time.
- Does not model weather, clouds, reflections, glare, energy, HVAC, or building
  simulation.
- Does not render sun paths, shadows, windows, or 3D scenes.
- Does not import branch-specific locations or presets.

## When to consider this module

Use `core/daylight-geometry` when a sim needs approximate solar altitude,
azimuth, shadow length, or a vertical-window incidence trace. If a sim is about
to inline declination, hour-angle, altitude, or shadow formulas, use this module
instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every consuming daylight sim.
2. Add property tests for every new boundedness or symmetry invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Hiding city, syllabus, timezone, or weather presets in the kernel.
- Treating this package as a building-energy simulator.
- Rendering geometry or scene assets from this package.

## How the Anieyrudh Filter reads this module

The Filter checks that daylight visuals make the same quantitative claims as
this kernel. A sun-path, shadow, or window-incidence readout whose values
disagree with these functions beyond `daylightGeometryTolerance.default` is
rejected; the visual layer cannot quietly teach a different model.
