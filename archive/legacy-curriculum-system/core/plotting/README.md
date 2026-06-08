# @paideia/plotting

Small React/SVG plotting components for 2D mathematical visuals. The package
renders function graphs, parametric curves, vector fields, scatter overlays,
and simple tangent/secant affordances without mutating caller-owned data.

```tsx
import { FunctionPlot } from "@paideia/plotting";

export function ReciprocalPlot() {
  return (
    <FunctionPlot
      domain={{ min: -2, max: 2 }}
      f={(x) => 1 / x}
      range={{ min: -5, max: 5 }}
      samples={240}
    />
  );
}
```

Undefined or out-of-range function samples become visible path gaps. The
renderer does not connect across non-finite values, thrown evaluations, or
points outside the caller-declared range.
