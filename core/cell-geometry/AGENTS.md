# core/cell-geometry · agent contract

## What this module is

The deterministic geometric kernel for cell-scale shapes: spheres, cylinders
(rods), and slabs (sheets). Provides surface area, volume,
surface-area-to-volume (SA:V) ratio, and a Fick-style 3D diffusion-time
estimate. It owns the recurring shape math behind the
cell-structure-and-the-membrane and related cell-biology containers so sims do
not reinvent `4 pi r^2` and the SA:V scaling argument.

## Public interface

Exports from `@paideia/cell-geometry`:

- `type Length` — branded number, metres.
- `type Area` — branded number, square metres.
- `type Volume` — branded number, cubic metres.
- `type InverseLength` — branded number, per metre (SA:V is `Area / Volume`).
- `type DiffusionCoefficient` — branded number, square metres per second.
- `type DiffusionTime` — branded number, seconds.
- `type SphereInput` — `{ radius: Length }`.
- `type CylinderInput` — `{ radius: Length; length: Length }`.
- `type SlabInput` — `{ thickness: Length; width: Length; depth: Length }`.
- `type DiffusionInput` — `{ characteristicLength: Length; diffusionCoefficient: DiffusionCoefficient }`.
- `type ShapeMetrics` — `{ surfaceArea: Area; volume: Volume; surfaceToVolumeRatio: InverseLength }`.
- `length(value: number): KernelResult<Length>` — accepts positive finite metres.
- `area(value: number): KernelResult<Area>` — accepts non-negative finite m^2.
- `volume(value: number): KernelResult<Volume>` — accepts non-negative finite m^3.
- `diffusionCoefficient(value: number): KernelResult<DiffusionCoefficient>` — accepts non-negative finite m^2/s.
- `sphere(input: SphereInput): KernelResult<ShapeMetrics>` — `S = 4 pi r^2`, `V = (4/3) pi r^3`.
- `cylinder(input: CylinderInput): KernelResult<ShapeMetrics>` — closed cylinder, `S = 2 pi r (r + L)`, `V = pi r^2 L`.
- `slab(input: SlabInput): KernelResult<ShapeMetrics>` — rectangular sheet, `S = 2(td + tw + dw)`, `V = t d w`.
- `surfaceToVolumeRatio(surfaceArea: Area, volume: Volume): KernelResult<InverseLength>` — fails when `volume <= 0`.
- `diffusionTimeEstimate(input: DiffusionInput): KernelResult<DiffusionTime>` — returns `t = L^2 / (6 D)` (the standard Fick mean-square-displacement estimate in three dimensions). Fails on zero diffusion coefficient.

## Invariants the caller must preserve

- Lengths are strictly positive finite numbers in metres. Zero or negative
  lengths describe a degenerate shape and are rejected.
- Areas, volumes, and diffusion coefficients accept zero (a degenerate or
  fully-blocked shape) but reject negatives and non-finite values.
- All shape calculations preserve the units in the brand. Callers do not
  re-multiply by `1e-6` (microns) at the boundary unless they have explicitly
  converted to metres first.
- The diffusion-time estimate uses the 3D mean-square-displacement convention
  `<r^2> = 6 D t`. Sims that need 1D or 2D variants should derive them at the
  call site by dividing the result by 3 or 1.5 — this kernel exposes the most
  commonly cited textbook form only.

## What this module does NOT do

- Does **not** model arbitrary surfaces (ellipsoids, dendritic trees, gyrified
  membranes). Use a numerical-geometry kernel for that.
- Does **not** model time-dependent diffusion, anisotropic diffusion tensors,
  or finite-volume transport. Use `core/dynamical-systems` plus a transport
  kernel.
- Does **not** model biological content: there is no "mitochondrion" or
  "bacterium" preset; containers supply their own labels.
- Does **not** render anything.

## When to consider this module

Use `core/cell-geometry` when a sim needs surface area, volume, SA:V ratio, or
a back-of-envelope diffusion-time estimate for a sphere, cylinder, or slab.
If a container is about to inline `4 * Math.PI * r * r`, stop and use this
module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that alters the brand identity of
   exported types, the diffusion convention, or the closed-cylinder
   convention.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures
  instead of `KernelResult.err(...)`.
- Hard-coding micron-to-metre conversions inside the kernel.
- Special-casing bacterium vs. animal cell vs. plant cell.
- Exposing `diffusionTime` without a `DiffusionCoefficient` brand on the
  input.
