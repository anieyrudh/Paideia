---
subject: physics
concept: gravitational-fields
branch: a-level
level: H2
syllabus_ref: "9478 / Section II / Energy and Fields"
prerequisites:
  - circular-motion
  - forces-and-equilibrium
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Gravitational Fields

## First-Principles Explanation

Masses attract other masses. Instead of drawing a separate force pair for every possible probe, we describe what the source mass sets up around itself: at each point in space there is a direction and a force per kilogram that a small test mass would experience. That description is the gravitational field.

Field strength is defined by asking what force would act on each kilogram of test mass at the point:

```text
g = F / m
```

For a spherical source mass treated as a point mass at its centre, geometry spreads the same attraction over larger spherical surfaces as distance increases. That is why the strength follows an inverse square:

```text
g = GM / r^2
```

The field points towards the source mass. Direction is separate from magnitude: an inward arrow does not make the strength negative. Doubling `r` makes `g` one quarter as large because the denominator is squared.

Gravitational potential uses infinity as the zero reference. Around an attractive mass,

```text
phi = -GM / r
```

The negative sign means work must be done by an external agent to move a mass from radius `r` to infinity. For a test mass `m`, gravitational potential energy is

```text
E_p = m phi
```

Circular orbits connect fields to circular motion. The source mass creates the field, and the orbiting mass responds to it. Gravity supplies the centripetal acceleration:

```text
GMm / r^2 = mv^2 / r
v = sqrt(GM / r)
```

The test mass cancels. A heavier satellite feels a larger force, but it does not need a different circular-orbit speed at the same radius around the same planet.

## Common traps

- Treating `g = 9.81 N kg^-1` as constant at every distance. That is only a useful near-surface approximation over small height changes.
- Multiplying by the test mass too early. Field strength belongs to the source mass and radius; force belongs to the test mass in that field.
- Thinking gravitational potential energy must be positive. With zero at infinity, bound masses have negative potential energy.

## Canonical example

At Earth's surface, `M = 5.972 x 10^24 kg` and `r = 6.371 x 10^6 m`.

```text
g = (6.67430 x 10^-11)(5.972 x 10^24) / (6.371 x 10^6)^2
  = 9.82 N kg^-1
```

At twice the radius, the denominator is four times larger, so the field strength is about `2.46 N kg^-1`.
