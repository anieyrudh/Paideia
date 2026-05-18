---
subject: physics
concept: physical-quantities-and-units
branch: a-level
level: H2
syllabus_ref: "9478 / Section I / 1(a)-1(g)"
prerequisites: []
aid_types:
  - simulation
  - concept-card
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
change it to `5 s` without changing the kind of quantity. A valid physics
equation must describe the same kind of quantity on both sides, so dimensions
act like a fast reality check before any numbers are substituted.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, speed, acceleration, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Dimension:** the base-quantity pattern of a physical quantity, such as `L T^-1` for speed.
- **Dimensional consistency:** the requirement that quantities added, compared, or equated must have matching dimensions.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly. A dimensional check cannot prove an equation is the right
model, but it can prove that a mismatched equation is impossible.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- Force has units `N = kg m s^-2` because `force = mass × acceleration` combines `kg` with `m s^-2`.
- `distance = speed + time` is impossible as written because `m`, `m s^-1`, and `s` do not share the same dimensions.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Adding unlike quantities because the numerical values look compatible.
- Assuming matching units decide whether a quantity is scalar or vector; speed and velocity share dimensions, but velocity also needs direction.

## Interactive Lab

The dimensional consistency checker asks for a prediction first, then unlocks an
equation lab. Learners compare the left-side quantity with right-side unit
combinations, inspect base vs derived quantity cards, and see whether each
candidate is scalar or vector where direction is relevant.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit.
3. Reduce derived units to base units if needed.
4. Check whether operations preserve dimensions.
5. Convert units only by multiplying by a ratio equal to one.
6. Reject equations whose left and right dimensions do not match.
