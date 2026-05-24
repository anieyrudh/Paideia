# @paideia/structural-analysis

Deterministic introductory structural-analysis calculations for Paideia
simulations.

Use this package when a sim needs shared numbers for axial stress, strain,
Young's modulus, axial elongation, section properties, beam bending stress,
torsional shear, Euler buckling, plane-stress principal values, von Mises
stress, or safety factor. Rendering belongs in the consuming simulation or a
visual kernel such as `core/charting`, `core/plotting`, or `core/three-scene`.

## Example

```ts
import { metres, newtons } from "@paideia/shared";
import {
  axialStress,
  pascals,
  squareMetres,
} from "@paideia/structural-analysis";

const stress = axialStress({
  axialForceNewtons: newtons(10_000),
  areaSquareMetres: squareMetres(0.002),
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero area
or non-finite section properties, return `err(...)` rather than throwing.

## Scope

This package models scalar closed-form mechanics-of-materials calculations. It
does not run finite-element analysis, solve indeterminate structures, simulate
fatigue/crack growth/plasticity, or include a material database.
