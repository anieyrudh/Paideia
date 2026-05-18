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

A physical quantity is something about the world that can be measured. A complete
measurement names the quantity and gives a numerical value with a unit. Writing
`5` is only a number; writing `5 m` says the quantity is a length and the metre
is the comparison standard.

Units are not decoration. They carry the dimension of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity. This is why a valid
physics equation must have the same base-unit fingerprint on both sides.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, force, or energy.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Dimensional consistency:** the requirement that quantities added, compared, or equated have matching dimensions.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly. A unit check cannot prove that an equation is physically
true, but a mismatch proves that the equation is false as written.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- Force has units `N = kg m s^-2`; `kg m s^-1` is momentum, not force.
- Energy has units `J = kg m^2 s^-2`, so the unit fingerprint matches `mass × speed²`.

## Interactive Lab

The dimensional consistency checker asks you to predict the unit fingerprint of
`mass × speed` before any verdict appears. After you commit, you can switch
between equation cards and compare base-unit powers side by side. The goal is to
see units as constraints on valid equations, not as labels added after arithmetic.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Accepting an equation because the numerical values look plausible even when the units differ.
- Adding unlike quantities because the numerical values look compatible.

## Problem-Solving Pattern

1. Name the physical quantity on each side of the statement.
2. Write each quantity with its SI unit.
3. Expand derived units into base units when the formula is unclear.
4. Combine base-unit powers by multiplication or division.
5. Check whether operations preserve dimensions.
6. Convert units only by multiplying by a ratio equal to one.
7. State the final value with the correct unit.
