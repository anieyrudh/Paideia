# @paideia/vector-calculus

Pure numerical vector-calculus helpers for multivariable-calculus simulations.

Use this package when a container needs a gradient arrow, divergence/curl probe,
line-integral work readout, scalar path integral, rectangular double integral,
or sampled vector-field arrows.

```ts
import { curl2D, gradient2D, lineIntegral2D, point2 } from "@paideia/vector-calculus";

const point = point2(1, 2);

if (point.ok) {
  const gradient = gradient2D((x, y) => x * x + y * y, point.value);
  const curl = curl2D((x, y) => [-y, x], point.value);
  const work = lineIntegral2D(
    (x, y) => [-y, x],
    (t) => [Math.cos(t), Math.sin(t)],
    { min: 0, max: Math.PI * 2 },
  );
  console.log({ gradient, curl, work });
}
```

## Assumptions

- User-supplied fields and curves are pure functions.
- Numerical derivatives use central differences.
- Rectangular double integrals use midpoint or trapezoid grid rules.
- Line integrals use midpoint samples along a parametric curve.
- Rendering belongs in `@paideia/plotting`, `@paideia/charting`, or the
  consuming simulation package.
