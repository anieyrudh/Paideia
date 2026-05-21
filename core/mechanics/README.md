# @paideia/mechanics

Deterministic Newtonian mechanics helpers for Paideia simulations. The package
owns shared closed-form calculations for constant acceleration, projectiles,
forces, work, energy, momentum, uniform circular motion, elastic collisions,
simple harmonic motion, and inverse-square gravitational fields.

## Usage

```ts
import { averagePower, kinematics1D, workEnergyTransfer } from "@paideia/mechanics";
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

All public inputs and outputs use SI units. Shared branded units are used where
the quantity crosses the kernel boundary; composite vector units are named in
fields such as `velocityMetresPerSecond`. The inverse-square gravitational
helpers expose branded field strength in `N kg^-1`, branded gravitational
potential in `J kg^-1`, and potential energy in joules using SI inputs. Expected invalid inputs return
`KernelResult.err(...)`; the kernel does not throw for ordinary domain errors.

Work-energy helpers own the shared calculations for final kinetic store and
average power so simulations do not reimplement those formulas locally.
`springOscillator` owns the ideal mass-spring timing, SHM sample, and kinetic
plus elastic potential energy trace for containers that need a product-facing
spring oscillator without duplicating oscillator formulae.
Uniform circular motion owns the shared `a_c = v^2 / r`, `F_c = ma_c`, angular
speed, and period calculations for constant-speed circular paths.

The package does not render mechanics visuals, run animation loops, solve
arbitrary ODEs, or choose branch-specific teaching constants.
