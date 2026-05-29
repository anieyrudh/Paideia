# Optics · Technical Record

## Public Interface Summary

`@paideia/optics` exports branded refractive-index values plus pure helpers for:

- `snellRefraction`
- `thinLensImage`
- `mirrorImage`
- `magnification`
- `lensRaySample`

The package owns first-year geometrical-optics calculations and deterministic
ray-diagram evidence. Rendering and multi-surface optical systems stay outside
this kernel.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Refractive indices are finite and positive | `refractiveIndex` guard returns `out-of-domain` |
| Angles, focal lengths, heights, and distances are finite | Runtime guards return `out-of-domain` |
| Object and screen distances are positive | `positiveFinite` guard returns `out-of-domain` |
| Lens/mirror focal length is non-zero | `thinLensImage` returns `precondition-violated` |
| Mirror kind matches focal sign | `mirrorImage` returns `precondition-violated` |
| Lens kind matches focal sign for ray samples | `lensRaySample` returns `precondition-violated` |
| Total internal reflection has no real refracted angle | `snellRefraction` omits `refractedAngleRadians` |
| Overflow is not silently rendered | Derived-value guards return `numerical-instability` |
| Caller-owned inputs are not mutated | Tests compare input snapshots and frozen outputs |

## Dependencies And Licenses

- Runtime dependencies: `@paideia/shared` only.
- Development dependencies: TypeScript and Vitest, matching existing core
  package conventions.
- No rendering, camera, physics-engine, or GPL-family runtime dependencies are
  bundled.

## Test Strategy

- Happy paths cover Snell refraction, total internal reflection, real and
  virtual lens images, image at infinity, mirrors, magnification, and ray
  samples.
- Error paths cover `out-of-domain` and `precondition-violated`.
- Property-style checks verify Snell symmetry below critical angle.
- Immutability checks confirm caller inputs are not mutated and ray outputs are
  frozen.

## Anieyrudh Filter pass

Date: 2026-05-29
Filter version: aniegpt v1.0

### P0 issues

- Scope could sprawl into ray tracing, camera simulation, or wave optics.
  Resolved by limiting the package to closed-form geometrical optics and
  paraxial ray samples.
- Total internal reflection could incorrectly render a fake refracted ray.
  Resolved by returning `totalInternalReflection: true` and omitting
  `refractedAngleRadians`.

### P1 issues

- Sign conventions can become invisible in UI layers. Resolved by documenting
  positive/negative focal-length conventions and testing real/virtual image
  orientation.
- Ray samples could be mistaken for a physical tracer. Resolved by documenting
  them as deterministic paraxial teaching evidence only.

### High-bandwidth questions surfaced

- If a future container needs multi-lens systems, it should use a separate
  matrix-optics contract rather than extending this first-year helper silently.

## P2 Followups

- Add mirror-specific ray samples only when a container needs mirror ray
  diagrams.
- Add bounded two-lens or matrix-optics helpers only through a separate
  contract if a queue item needs compound optical systems.
