# @paideia/dynamical-systems

Pure numerical helpers for state-space dynamical systems. The package steps
continuous vector fields, samples trajectories, iterates discrete maps,
approximates 2D Jacobians, and classifies planar linear equilibria.

It does not render, persist, animate, or own PMOE-T stage state. Simulations
should pair this kernel with `@paideia/sim-runtime`, `@paideia/ui-sim`, and a
renderer such as `@paideia/plotting`.

## Usage

```ts
import { classifyLinear2D, integrateFlow } from "@paideia/dynamical-systems";

const orbit = integrateFlow(([x, y]) => [y ?? 0, -(x ?? 0)], [1, 0], {
  dt: 0.02,
  steps: 200,
  method: "rk4",
});

const stability = classifyLinear2D([
  [0, 1],
  [-1, 0],
]);

if (orbit.ok && stability.ok) {
  console.log(orbit.value.at(-1), stability.value.kind); // "center"
}
```

## API

- `stepFlow(...)` advances one explicit Euler, midpoint, or RK4 step.
- `integrateFlow(...)` returns immutable trajectory snapshots, including the
  initial state.
- `iterateMap(...)` returns immutable discrete orbit snapshots, including step
  zero.
- `jacobian2D(...)` computes a central-difference Jacobian for planar systems.
- `classifyLinear2D(...)` classifies a 2D linear equilibrium from trace,
  determinant, and discriminant.

All expected failures return `KernelResult.err(...)`; callers should never infer
that `NaN` means a meaningful state.
