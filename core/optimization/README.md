# @paideia/optimization

Deterministic 2D optimization kernels for Paideia gradient-descent and linear-programming simulations.

## Usage

```ts
import {
  gradientDescent,
  linearFeasibleRegion,
  optimizeLinearObjective,
} from "@paideia/optimization";

const trace = gradientDescent((x, y) => (x - 2) ** 2 + (y + 1) ** 2, [5, 3], {
  learningRate: 0.2,
});

const region = linearFeasibleRegion(
  [
    { a: 1, b: 1, relation: "<=", c: 1 },
    { a: 1, b: 0, relation: ">=", c: 0 },
    { a: 0, b: 1, relation: ">=", c: 0 },
  ],
  { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
);

if (region.ok) {
  const optimum = optimizeLinearObjective(region.value, {
    cx: 2,
    cy: 1,
    direction: "max",
  });
}
```

`gradientDescent()` samples finite-difference gradients and returns every point in the trace. `linearFeasibleRegion()` clips a 2D linear program to a supplied `Rect`, and `optimizeLinearObjective()` chooses the best vertex in that clipped region.

This package returns `KernelResult` errors for invalid domains, malformed constraints, undefined objectives, and infeasible clipped regions. It does not render, persist state, or guarantee global optima for nonlinear objectives.
