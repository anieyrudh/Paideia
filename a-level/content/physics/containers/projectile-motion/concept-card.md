---
subject: physics
concept: projectile-motion
branch: a-level
level: H2
syllabus_ref: 9478 / Section II / Projectile motion
prerequisites:
  - kinematics-in-one-dimension
  - resolving-vectors
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Projectile Motion

Projectile motion describes the path of an object after it is launched and then
moves under gravity alone. In the ideal A-Level model, air resistance is
ignored, so the horizontal and vertical motions can be solved separately.

The launch velocity is resolved into components:

- the horizontal component stays constant;
- the vertical component changes because acceleration is `g` downward;
- both components share the same time of flight.

This separation is powerful because a two-dimensional trajectory becomes two
linked one-dimensional kinematics problems. The horizontal equation gives
range once the flight time is known. The vertical equation gives the flight
time because landing happens when the vertical position reaches the ground.

## Key Definitions

- **Projectile:** an object that has been launched and then moves only under
  gravity in the model.
- **Range:** the horizontal distance from launch point to landing point.
- **Time of flight:** the total time between launch and landing.
- **Peak height:** the greatest vertical position reached by the projectile.
- **Components:** horizontal and vertical parts of the initial velocity.

## Canonical Example

A ball is launched at speed `u` and angle `theta` from height `h`. Resolve the
launch velocity:

```latex
u_x = u\cos\theta,\qquad u_y = u\sin\theta
```

Then solve the vertical landing equation:

```latex
0 = h + u_y t - \frac{1}{2}gt^2
```

The positive root gives the time of flight. The range is then:

```latex
R = u_x t
```

## Why It Matters

Projectile motion is the first place where learners must combine vector
resolution with kinematics. It prepares the ground for circular motion,
gravitational fields, momentum in two dimensions, and any engineering context
where one direction has an acceleration and the other does not.

## Common Misconceptions

- Gravity changes the vertical velocity, not the horizontal velocity.
- A projectile does not need a continuing forward force after launch.
- The launch angle changes the initial velocity components, not the value of
  gravitational acceleration.
