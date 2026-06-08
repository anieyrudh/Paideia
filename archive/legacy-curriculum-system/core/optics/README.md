# @paideia/optics

Reusable geometrical-optics helpers for Paideia containers. The kernel covers
Snell refraction, critical-angle evidence, thin-lens and mirror image
calculations, magnification, and deterministic paraxial ray samples.

It is not a renderer, wave-optics solver, camera model, or multi-surface ray
tracer.

## Example

```ts
import { metres } from "@paideia/shared";
import { thinLensImage } from "@paideia/optics";

const image = thinLensImage({
  focalLengthMetres: metres(0.1),
  objectDistanceMetres: metres(0.3),
  objectHeightMetres: metres(0.02),
});

if (image.ok) {
  console.log(image.value.imageDistanceMetres, image.value.magnification);
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
