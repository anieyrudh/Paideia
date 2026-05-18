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
  - reasoning-lab
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
change it to `5 s` without changing the kind of quantity. This is why a unit
check is more than a tidy final step: it is a test of whether an equation could
possibly describe the same physical quantity on both sides.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, velocity, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Dimension:** the base-quantity structure of a unit, such as `L T^-1` for velocity or `M L T^-2` for force.
- **Dimensional consistency:** the rule that quantities can be added or equated only when their dimensions match.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly. For example, `s = vt + 1/2 at` cannot be right for a
displacement because `vt` is a length but `at` is a velocity; the second term
needs another factor of time.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- Force is derived: `N = kg m s^-2`, so `F = ma` is dimensionally consistent.
- A scalar/vector decision is separate from a base/derived decision: time is a base scalar, displacement is a base-vector quantity in this course context, and force is a derived vector.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Adding unlike quantities because the numerical values look compatible.
- Assuming a familiar-looking equation is valid without checking each term's dimensions.

## Interactive Lab

The dimensional consistency checker asks you to predict which proposed equation
will fail before any verdict appears. After committing, you can switch between
sample equations, expand each term into base dimensions, and explain why matching
units are necessary before numbers are substituted.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit.
3. Reduce derived units to base units if needed.
4. Check whether operations preserve dimensions.
5. If terms are added or equated, require matching dimensions.
6. Convert units only by multiplying by a ratio equal to one.
