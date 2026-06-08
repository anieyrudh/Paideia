# Daylight Geometry · Technical Record

## Public Interface Summary

`@paideia/daylight-geometry` exports branded day-of-year and solar-time values
plus pure helpers for:

- `solarDeclination`
- `solarPosition`
- `shadowLength`
- `windowSunPath`

The package owns deterministic educational daylight geometry. It does not own
weather, civil time, ephemerides, glare, rendering, or energy simulation.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Day of year is an integer from 1 to 366 | `dayOfYear` returns `out-of-domain` |
| Solar time is finite in [0, 24] | `solarTimeHours` returns `out-of-domain` |
| Latitude is finite in [-pi/2, pi/2] | `validateLatitude` returns `out-of-domain` |
| Shadow object height is non-negative | `shadowLength` returns `out-of-domain` |
| Window samples have ordered time bounds | `windowSunPath` returns `precondition-violated` |
| Sample count is an integer >= 2 | `windowSunPath` returns `precondition-violated` |
| Derived geometry stays finite | Derived-value guards return `numerical-instability` |
| Caller-owned inputs are not mutated | Tests compare input snapshots and frozen outputs |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No GIS, weather, astronomy, rendering, or GPL-family runtime dependencies are
  bundled.

## Test Strategy

- Happy paths cover equinox noon altitude, declination signs, shadow length,
  no-shadow nighttime behavior, and vertical-window incidence sampling.
- Error paths cover `out-of-domain` and `precondition-violated`.
- Property-style checks verify equinox noon-altitude symmetry around the
  equator.
- Immutability checks confirm caller inputs are not mutated and sample outputs
  are frozen.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could sprawl into ephemerides, timezone logic, weather, glare, or
  building-energy simulation. Resolved by limiting the package to deterministic
  educational geometry with solar-time inputs.
- Below-horizon sun could produce invalid shadow lengths. Resolved by returning
  daylight state and omitting `lengthMetres` when no direct shadow exists.

### P1 issues

- Azimuth conventions can be invisible in UI layers. Resolved by documenting
  north-clockwise azimuth and testing normalized output bounds.
- Window incidence could be mistaken for irradiance or energy. Resolved by
  exposing only a geometric cosine factor and front/back flag.

### High-bandwidth questions surfaced

- If a future container needs civil time, longitude, equation-of-time, or
  weather coupling, that should be a separate contract rather than hidden in
  this deterministic kernel.

## P2 Followups

- Add equation-of-time and longitude correction only through a separate
  contract if a queue item needs clock-time comparison.
- Add simple façade self-shading helpers only when a container needs geometric
  obstruction evidence.
