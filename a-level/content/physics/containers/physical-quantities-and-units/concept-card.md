---
subject: physics
concept: physical-quantities-and-units
branch: a-level
level: H2
syllabus_ref: "9478 / Section I / 1(a)-1(g)"
prerequisites: []
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Physical Quantities and Units

## First-Principles Explanation

A physical quantity is something about the world that can be measured. The
measurement is incomplete unless it gives both a numerical value and a unit.
Writing `5` is just a number; writing `5 m` says the quantity is a length and
the metre is the comparison standard.

Units are not decoration. They carry the dimension of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity.

A useful way to see this is as a dependency map. Some quantities are **base
quantities**: length, mass, time, electric current, temperature, amount of
substance, and luminous intensity. Other quantities are **derived quantities**:
speed depends on length and time, acceleration depends on velocity and time, and
force depends on mass and acceleration.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, force, velocity, or pressure.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Dimension:** the base-quantity signature of a quantity, such as `L T^-1` for speed.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Scalar quantity:** a quantity fully described by magnitude and unit, such as speed or pressure.
- **Vector quantity:** a quantity where direction is part of the physical meaning, such as velocity, acceleration, or force.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly.

Dimensional consistency is a before-the-numbers check. If the left side of an
equation has dimension `L T^-1`, the right side must reduce to `L T^-1` too.
That is why `speed = distance / time` can be valid, while `speed = distance ×
time` cannot describe speed no matter what numbers are substituted.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- Force has units `N = kg m s^-2`, so `force = mass × acceleration` is dimensionally consistent.
- Area has units `m^2` because it is length multiplied by length.
- Pressure has units `Pa = kg m^-1 s^-2`, because pressure is force per area.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Adding unlike quantities because the numerical values look compatible.
- Memorising a derived unit name without tracing the base quantities underneath it.
- Forgetting that scalar/vector classification is about direction, not about the unit alone.

## Product Lab

The interactive quantity map asks learners to predict a unit-consistent equation
before revealing the dependency graph. After committing, learners choose a
quantity, inspect whether it is base or derived, compare scalar/vector status,
and test equations by reducing both sides to base dimensions.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit.
3. Decide whether the quantity is base or derived.
4. Reduce derived units to base dimensions if needed.
5. Check whether operations preserve dimensions on both sides of the equation.
6. Convert units only by multiplying by a ratio equal to one.
7. State the final value with the correct unit and, where relevant, direction.
