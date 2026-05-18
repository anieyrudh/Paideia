# @paideia/mechanics Technical Notes

## Public interface

The public API is exactly the export list in `AGENTS.md`: unit-named mechanics
types, `mechanicsTolerance`, and pure functions for kinematics, projectile
sampling, net force, Newton's second law, work, kinetic energy, momentum,
elastic collisions, and simple harmonic motion.

## Invariant enforcement

| Invariant | Enforcement |
|---|---|
| SI units at boundaries | Branded shared units where available and explicit field names for composite units. |
| Finite numeric inputs | Runtime guards return `precondition-violated`. |
| Non-negative elapsed time | `kinematics1D`, `projectileAt`, and `simpleHarmonicMotion` guard `Seconds`. |
| Positive mass | `accelerationFromForce`, `kineticEnergy`, `momentum1D`, and `elasticCollision1D` guard mass. |
| Conservation laws | Property-style Vitest loops assert SUVAT, elastic momentum, and elastic kinetic energy invariants. |
| No caller mutation | Functions construct fresh results; tests snapshot force arrays before/after use. |

## Dependency/license notes

Runtime dependencies are limited to `@paideia/shared` via `workspace:*`.
No third-party physics engine is bundled, so no GPL/AGPL/LGPL dependency is
introduced.

## Anieyrudh Filter pass

- Visual truth source: projectile arcs, vector sums, collision replays, energy
  bars, and SHM traces must match these closed-form calculations within
  `mechanicsTolerance`.
- Scope boundary: the module intentionally excludes drag, variable acceleration,
  branch-specific gravity shortcuts, and rendering so sims cannot hide model
  choices inside the kernel.
- Failure semantics: invalid learner-controlled parameters return explicit
  `KernelResult` errors instead of leaking `NaN` into a visual.
