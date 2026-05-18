---
subject: physics
concept: physical-quantities-and-units
branch: a-level
level: H2
syllabus_ref: "9478 / Section I / 1(a)-1(g)"
prerequisites: []
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Physical Quantities and Units

## First-Principles Explanation

A physical quantity is something measurable about the world. A measurement is
complete only when it gives both a numerical value and a unit. Writing `5` is
just a number; writing `5 m` says the quantity is a length and the metre is the
comparison standard.

Units are not decoration. They carry the **dimension** of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity.

That makes units a physics lie detector. If the left and right sides of an
equation do not reduce to the same SI base dimensions, the equation cannot be a
valid physical relationship, even if the numbers look convenient.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, speed, acceleration, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** one of the SI starting quantities, such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1`, acceleration in `m s^-2`, or force in `kg m s^-2`.
- **Scalar quantity:** a quantity described by magnitude only, such as distance, time, mass, or speed.
- **Vector quantity:** a quantity that also needs direction, such as displacement, velocity, acceleration, or force.
- **Dimensional consistency:** the rule that quantities being added, compared, or equated must have compatible base dimensions.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly. Dimensional consistency does not prove an equation is
true, but a mismatch proves the equation is false.

## Interactive Lab: Impossible Equation Detector

The simulation asks learners to predict which equation is impossible before any
verdict is shown. After committing, students can switch between equation cards
and watch the detector expand units into base dimensions, compare both sides,
and flag scalar-vector traps where units alone are not enough.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- `distance = speed × time` is dimensionally consistent: `(m s^-1)(s) = m`.
- `distance = speed + acceleration` is impossible as written: `m s^-1` cannot be added to `m s^-2`.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Adding unlike quantities because the numerical values look compatible.
- Assuming matching units are enough when the target quantity is a vector and the expression has lost direction.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit.
3. Reduce derived units to base units if needed.
4. Check whether operations preserve dimensions.
5. Check whether scalar or vector direction information is required.
6. Convert units only by multiplying by a ratio equal to one.
