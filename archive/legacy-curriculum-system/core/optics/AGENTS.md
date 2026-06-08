# core/optics - agent contract

## What this module is

Pure first-year geometrical optics kernels for teaching refraction, thin lenses,
spherical mirrors, magnification, and deterministic ray samples. It returns
deterministic numbers and readonly records only; ray rendering, photoreal
optics, wave optics, camera models, and learner controls live elsewhere.

## Public interface

Exports from `@paideia/optics`:

- `opticsTolerance: { default: number; tight: number; loose: number }`
- `RefractiveIndex = Brand<number, "Optics.RefractiveIndex">`
- `LensKind = "converging" | "diverging"`
- `MirrorKind = "concave" | "convex"`
- `ImageNature = "real" | "virtual" | "at-infinity"`
- `Orientation = "upright" | "inverted" | "none"`
- `RayPoint = { xMetres: Metres; yMetres: Metres }`
- `RaySegment = { start: RayPoint; end: RayPoint; label: string }`
- `SnellInput = { incidentRefractiveIndex: RefractiveIndex; transmittedRefractiveIndex: RefractiveIndex; incidentAngleRadians: Radians }`
- `SnellResult = { incidentAngleRadians: Radians; refractedAngleRadians?: Radians; criticalAngleRadians?: Radians; totalInternalReflection: boolean }`
- `ThinLensInput = { focalLengthMetres: Metres; objectDistanceMetres: Metres; objectHeightMetres?: Metres }`
- `ThinLensImage = { imageDistanceMetres?: Metres; magnification?: number; imageHeightMetres?: Metres; nature: ImageNature; orientation: Orientation }`
- `MirrorInput = { focalLengthMetres: Metres; objectDistanceMetres: Metres; objectHeightMetres?: Metres; kind: MirrorKind }`
- `MirrorImage = ThinLensImage & { mirrorKind: MirrorKind }`
- `LensRaySampleInput = ThinLensInput & { lensKind: LensKind; rayHeightMetres: Metres; screenDistanceMetres?: Metres }`
- `LensRaySample = { lensKind: LensKind; image: ThinLensImage; segments: readonly RaySegment[] }`
- `refractiveIndex(value: number): KernelResult<RefractiveIndex>`
- `snellRefraction(input: SnellInput): KernelResult<SnellResult>`
- `thinLensImage(input: ThinLensInput): KernelResult<ThinLensImage>`
- `mirrorImage(input: MirrorInput): KernelResult<MirrorImage>`
- `magnification(objectDistanceMetres: Metres, imageDistanceMetres: Metres): KernelResult<number>`
- `lensRaySample(input: LensRaySampleInput): KernelResult<LensRaySample>`

## Invariants the caller must preserve

- Refractive indices are finite and positive.
- Angles are finite radians.
- Object distances are finite and positive metres.
- Focal lengths are finite metres and must be non-zero for lens/mirror helpers.
- Heights and ray heights are finite metres.
- Positive lens focal length means converging; negative means diverging.
- Mirror `kind` must match focal sign: concave mirrors use positive focal
  length and convex mirrors use negative focal length.
- Ray samples are paraxial teaching rays, not physical rendering paths.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not render lenses, mirrors, wavefronts, cameras, or diagrams.
- Does not model diffraction, interference, polarization, aberration, thick
  lenses, matrix optics, or photoreal paths.
- Does not solve arbitrary optical systems or multi-surface ray tracing.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/optics` when a sim needs Snell's law, critical-angle evidence, thin
lens or mirror image calculations, magnification, or simple ray-diagram
segments. If a sim is about to inline `n1 sin(theta1) = n2 sin(theta2)`,
`1/f = 1/u + 1/v`, or `m = -v/u`, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every consuming optics sim.
2. Add property tests for every new symmetry, sign, or boundedness invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing degrees, centimetres, or screen units into public inputs.
- Mutating caller-owned ray arrays or records.
- Adding rendering, camera, or physics-engine dependencies to this pure kernel.
- Hiding branch-specific sign conventions or exam presets in the kernel.

## How the Anieyrudh Filter reads this module

The Filter checks that optics visuals make the same quantitative claims as this
kernel. A refraction, lens, mirror, or ray-diagram readout whose values disagree
with these functions beyond `opticsTolerance.default` is rejected; the visual
layer cannot quietly teach a different model.
