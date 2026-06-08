# @paideia/spatial-analysis

Reusable planar spatial-analysis helpers for Paideia containers. The kernel
covers polygon area and centroid, point-in-polygon classification, Euclidean
distance, circular buffer approximations, polygon adjacency, and simple
line-of-sight visibility against polygon obstacles.

It is not a GIS engine, projection package, spatial index, topology engine, or
renderer.

## Example

```ts
import { point2D, polygonMetrics } from "@paideia/spatial-analysis";

const a = point2D(0, 0);
const b = point2D(2, 0);
const c = point2D(2, 2);
const d = point2D(0, 2);

if (a.ok && b.ok && c.ok && d.ok) {
  const metrics = polygonMetrics([a.value, b.value, c.value, d.value]);
  console.log(metrics);
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
