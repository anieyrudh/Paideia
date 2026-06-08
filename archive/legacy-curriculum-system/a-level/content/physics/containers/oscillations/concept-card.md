---
subject: physics
concept: oscillations
branch: a-level
level: H2
syllabus_ref: "9478 / Section IV / Oscillations"
prerequisites:
  - kinematics-in-one-dimension
  - work-energy-power
  - waves
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Oscillations

## First-Principles Explanation

An oscillation is a repeated motion about an equilibrium position. In simple
harmonic motion, the acceleration is proportional to the displacement from
equilibrium and points back towards equilibrium.

```latex
a = -\omega^2 x
```

The minus sign means the acceleration is restoring: when displacement is to the
right, acceleration is to the left; when displacement is to the left,
acceleration is to the right. At equilibrium, displacement is zero, so
acceleration is zero even though speed can be greatest there.

For an ideal mass-spring oscillator:

```latex
\omega = \sqrt{\frac{k}{m}}, \qquad T = \frac{2\pi}{\omega}, \qquad f = \frac{1}{T}
```

Amplitude changes the maximum displacement and the total energy stored in the
oscillation, but it does not appear in the ideal period formula.

## Key Definitions

- **Equilibrium position:** the position where the resultant force and acceleration are zero.
- **Displacement:** signed distance from equilibrium.
- **Amplitude:** maximum displacement from equilibrium.
- **Period:** time for one complete oscillation.
- **Frequency:** oscillations per second, measured in hertz.
- **Angular frequency:** rate of phase change, measured in radians per second.
- **Simple harmonic motion:** oscillation where acceleration is proportional to displacement and directed towards equilibrium.

## Why This Matters

Oscillations connect mechanics, energy, and waves. The same period-frequency
ideas appear in springs, pendulums for small angles, sound sources, alternating
current, resonance, and many measurement instruments. The container forces the
learner to separate three ideas that are often blended: displacement sign,
timing, and energy exchange.

## Canonical Examples

- A mass on a spring released from rest at maximum displacement.
- A small-angle pendulum moving repeatedly through equilibrium.
- A car suspension oscillating after a bump.

## Common Misconceptions

- Saying a larger amplitude always makes the period longer.
- Saying acceleration is greatest at equilibrium because speed is greatest there.
- Saying zero displacement means the oscillator has zero energy.

## Problem-Solving Pattern

1. Define equilibrium and choose a sign convention for displacement.
2. Check whether acceleration is proportional to `-x`.
3. Convert between `T`, `f`, and `omega`.
4. Use `x(t) = A cos(omega t + phi)` to read displacement, velocity sign, and acceleration sign.
5. Interpret energy as exchange between kinetic and potential stores.
