# @paideia/mechanics

Deterministic Newtonian mechanics helpers for Paideia simulations. The package
owns shared closed-form calculations for constant acceleration, projectiles,
forces, work, energy, momentum, elastic collisions, and simple harmonic motion.

## Usage

```ts
import { kinematics1D } from "@paideia/mechanics";
import { metres, seconds } from "@paideia/shared";

const state = kinematics1D({
  initialPositionMetres: metres(0),
  initialVelocityMetresPerSecond: 4,
  accelerationMetresPerSecondSquared: -9.8,
  elapsedSeconds: seconds(0.5),
});

if (state.ok) {
  console.log(state.value.positionMetres);
}
```

## Scope

All public inputs and outputs use SI units. Composite units are named in the
field, such as `velocityMetresPerSecond`. Expected invalid inputs return
`KernelResult.err(...)`; the kernel does not throw for ordinary domain errors.

The package does not render mechanics visuals, run animation loops, solve
arbitrary ODEs, or choose branch-specific teaching constants.
