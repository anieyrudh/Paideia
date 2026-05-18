---
subject: physics
concept: physical-quantities-and-units
branch: a-level
level: H2
syllabus_ref: "9478 / Section I / 1(a)-1(g)"
prerequisites: []
aid_types:
  - simulation
  - reasoning-lab
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Physical Quantities and Units

## First-Principles Explanation

A physical quantity is something about the world that can be measured. A
measurement is incomplete unless it gives the quantity, a numerical value, a
unit, and—when it came from an instrument—an uncertainty. Writing `5` is just a
number; writing `5 m` says the quantity is a length and the metre is the
comparison standard.

Units are not decoration. They carry the dimension of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity.

Dimensional checks are a filter, not a proof. If units do not match, the
equation cannot describe the quantity. If units do match, the equation is only
dimensionally possible; the physical model still has to be justified.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Scalar quantity:** a quantity with magnitude only, such as distance, time, speed, mass, or temperature.
- **Vector quantity:** a quantity with magnitude and direction, such as displacement, velocity, acceleration, or force.
- **Uncertainty:** the stated range attached to a measurement because instruments and procedures have finite precision.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly. Uncertainty prevents a measured answer from pretending to
be exact.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- A complete measured speed record includes a value, a speed unit, and an uncertainty; a number alone is not a physical measurement.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Reporting a measured value as exact because a calculator displayed many digits.
- Adding unlike quantities because the numerical values look compatible.
- Treating a passed unit check as proof that an equation is physically correct.

## Interactive Lab

The measurement and uncertainty lab asks you to predict which speed record is
complete before the notebook is revealed. After committing, you can change the
raw distance, time, and uncertainties to see why `m ÷ s` gives `m s^-1`, why
`m + s` is not a valid speed unit, and how percentage uncertainties combine for
a division.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit and uncertainty when measured.
3. Classify whether the quantity is base or derived, and scalar or vector where relevant.
4. Reduce derived units to base units if needed.
5. Check whether operations preserve dimensions.
6. Convert units only by multiplying by a ratio equal to one.
