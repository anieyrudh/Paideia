# @paideia/cell-geometry

Deterministic geometric primitives for cell-scale shapes: spheres, cylinders
(rods), and rectangular slabs. Provides surface area, volume,
surface-area-to-volume ratio, and a Fick-style 3D diffusion-time estimate. All
inputs and outputs use SI metres, square metres, cubic metres, square metres
per second, and seconds.

## Exports

- `Length`, `Area`, `Volume`, `InverseLength`, `DiffusionCoefficient`, `DiffusionTime`
- `SphereInput`, `CylinderInput`, `SlabInput`, `DiffusionInput`, `ShapeMetrics`
- `length`, `area`, `volume`, `diffusionCoefficient`
- `sphere`, `cylinder`, `slab`
- `surfaceToVolumeRatio`
- `diffusionTimeEstimate`

## Usage

```ts
import {
  cylinder,
  diffusionCoefficient,
  diffusionTimeEstimate,
  length,
  sphere,
} from "@paideia/cell-geometry";

const r = length(5e-6); // 5 micrometres in metres
if (!r.ok) throw new Error(r.error.message);

const cell = sphere({ radius: r.value });
// cell.value.surfaceArea, cell.value.volume, cell.value.surfaceToVolumeRatio

const d = diffusionCoefficient(1e-9); // m^2/s, small-molecule estimate in water
const t = diffusionTimeEstimate({
  characteristicLength: r.value,
  diffusionCoefficient: d.value!,
});
// t.value is the textbook L^2 / (6 D) mean-square-displacement time in seconds.
```

## Scope

This module owns shape math. It deliberately does NOT cover arbitrary
surfaces, anisotropic diffusion, time-dependent transport, or any biological
content (no "mitochondrion" or "bacterium" presets). Each of those is a
separate kernel or out-of-scope.
