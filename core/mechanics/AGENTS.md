# core/mechanics · agent contract

## What this module is
The deterministic Newtonian mechanics kernel for Paideia simulations. It owns
constant-acceleration kinematics, projectile samples, force aggregation,
Newton's second law, work/energy/momentum helpers, one-dimensional elastic
collisions, uniform circular motion, and simple harmonic motion. It is pure TypeScript and returns
`KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/mechanics`:

- `mechanicsTolerance: { default: number; tight: number; loose: number }`
- `type Vector2`
- `type Kinematics1DInput`
- `type Kinematics1DState`
- `type ProjectileInput`
- `type ProjectileSample`
- `type SimpleHarmonicMotionInput`
- `type SimpleHarmonicMotionSample`
- `type ElasticCollision1DInput`
- `type ElasticCollision1DResult`
- `type WorkEnergyTransferResult`
- `type UniformCircularMotionInput`
- `type UniformCircularMotionResult`
- `kinematics1D(input: Kinematics1DInput): KernelResult<Kinematics1DState>`
- `projectileAt(input: ProjectileInput, elapsedSeconds: Seconds): KernelResult<ProjectileSample>`
- `netForce(forces: readonly Vector2[]): KernelResult<Vector2>`
- `accelerationFromForce(forceNewtons: Vector2, massKilograms: Kilograms): KernelResult<Vector2>`
- `workDone(forceNewtons: Newtons, displacementMetres: Metres, angleRadians?: Radians): KernelResult<Joules>`
- `kineticEnergy(massKilograms: Kilograms, speedMetresPerSecond: MetresPerSecond): KernelResult<Joules>`
- `workEnergyTransfer(initialKineticEnergyJoules: Joules, workJoules: Joules): KernelResult<WorkEnergyTransferResult>`
- `averagePower(workJoules: Joules, elapsedSeconds: Seconds): KernelResult<Watts>`
- `momentum1D(massKilograms: Kilograms, velocityMetresPerSecond: number): KernelResult<number>`
- `uniformCircularMotion(input: UniformCircularMotionInput): KernelResult<UniformCircularMotionResult>`
- `elasticCollision1D(input: ElasticCollision1DInput): KernelResult<ElasticCollision1DResult>`
- `simpleHarmonicMotion(input: SimpleHarmonicMotionInput, elapsedSeconds: Seconds): KernelResult<SimpleHarmonicMotionSample>`

## Invariants the caller must preserve
- All numeric inputs are SI values. Composite units are expressed in field
  names, e.g. `velocityMetresPerSecond`.
- `Seconds` inputs represent elapsed simulation time and must be finite and
  non-negative.
- Masses must be finite and strictly positive.
- Work uses scalar force and displacement magnitudes plus an angle. Do not pass
  signed magnitudes and also encode direction in the angle.
- Projectile motion assumes constant acceleration over the sample interval.
- Simple harmonic motion assumes an undamped oscillator with fixed angular
  frequency.
- Uniform circular motion assumes constant speed and positive radius.

## What this module does NOT do
- Does **not** model drag, rolling friction, variable mass, or relativistic
  mechanics.
- Does **not** solve arbitrary ODE systems.
- Does **not** render vectors, graphs, trails, or bodies.
- Does **not** know about A-Level or SUTD branch-specific conventions.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/mechanics` when a simulation needs shared calculations for
kinematics, forces, energy, momentum, collisions, projectile motion, or simple
harmonic motion. If a sim is about to inline SUVAT, `F = ma`, `KE = 1/2 mv^2`,
`a_c = v^2 / r`, or one-dimensional elastic collision formulae, use this module
instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every consuming mechanics sim.
2. Add property tests for every new conservation law or kinematic invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` instead of `KernelResult.err(...)`.
- Mixing kilometres, centimetres, degrees, or milliseconds into public inputs.
- Hiding branch-specific gravity constants in the kernel.
- Mutating vectors or arrays supplied by callers.
- Adding a physics engine dependency for closed-form A-Level mechanics.

## How the Anieyrudh Filter reads this module
The Filter checks that mechanics visuals make the same quantitative claims as
this kernel. A projectile arc, energy bar, collision replay, or SHM trace whose
displayed values disagree with these functions beyond `mechanicsTolerance`
is rejected; the visual layer cannot quietly teach a different model.
