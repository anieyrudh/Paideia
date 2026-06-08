# @paideia/dynamical-systems

Pure numerical helpers for state-space dynamical systems. The package steps
continuous vector fields, samples trajectories, iterates discrete maps,
approximates 2D Jacobians, constructs vector fields from planar linear-system
matrices, and classifies planar linear equilibria.

It does not render, persist, animate, or own PMOE-T stage state. Simulations
should pair this kernel with `@paideia/sim-runtime`, `@paideia/ui-sim`, and a
renderer such as `@paideia/plotting`.

## Usage

```ts
import {
  classifyLinear2D,
  integrateFlow,
  linearVectorField2D,
} from "@paideia/dynamical-systems";

const matrix = [
  [0, 1],
  [-1, 0],
] as const;

const field = linearVectorField2D(matrix);
if (!field.ok) throw new Error(field.error.message);

const orbit = integrateFlow(field.value, [1, 0], {
  dt: 0.02,
  steps: 200,
  method: "rk4",
});

const stability = classifyLinear2D(matrix);

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
- `linearVectorField2D(...)` constructs a pure vector field from a 2D linear
  system matrix.
- `classifyLinear2D(...)` classifies a 2D linear equilibrium from trace,
  determinant, and discriminant.

All expected failures return `KernelResult.err(...)`; callers should never infer
that `NaN` means a meaningful state.
