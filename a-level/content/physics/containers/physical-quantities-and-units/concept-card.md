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
status: draft
---

# Physical Quantities and Units

## First-Principles Explanation

A physical quantity is something about the world that can be measured. The
measurement is incomplete unless it gives a numerical value, a unit, and, in a
real practical setting, an uncertainty. Writing `5` is just a number; writing
`5 m` says the quantity is a length and the metre is the comparison standard.
Writing `5.0 ± 0.1 m` says how precisely that length was measured.

Units are not decoration. They carry the dimension of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity. Uncertainty follows
the same rule: an absolute uncertainty in length is also a length.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, speed, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Uncertainty:** the estimated range within which a measured value is expected to lie.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Scalar quantity:** a quantity with magnitude only, such as distance, time, mass, speed, or energy.
- **Vector quantity:** a quantity with magnitude and direction, such as displacement, velocity, acceleration, or force.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, expose when a formula has
been used incorrectly, and keep uncertainty attached to the quantity rather
than treated as a spare number.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- A trolley that travels `0.80 m` in `2.0 s` has average speed `0.40 m s^-1` because speed is distance divided by time.
- Speed is a derived scalar quantity with dimension `L T^-1`.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- `distance + time` is not a valid physical operation, even if both numbers are easy to add, because `L + T` is dimensionally inconsistent.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Treating uncertainty as a unit-free extra value.
- Adding unlike quantities because the numerical values look compatible.

## Product Lab

The measurement and uncertainty lab asks learners to predict the unit of average
speed before seeing the working. After the prediction is committed, learners
manipulate a trolley distance, timing, and uncertainties. The lab reveals:

1. the measured distance and time converted to SI units;
2. the derived quantity `average speed = distance / time`;
3. the unit chain `m / s = m s^-1`;
4. fractional uncertainty reasoning for a division; and
5. dimensional checks that permit `distance / time` but block `distance + time`.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit and uncertainty where relevant.
3. Classify whether the quantity is base or derived, and scalar or vector.
4. Reduce derived units to base units if needed.
5. Check whether operations preserve dimensions.
6. Convert units only by multiplying by a ratio equal to one.
