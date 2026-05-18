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
measurement is incomplete unless it gives both a numerical value and a unit.
Writing `5` is just a number; writing `5 m` says the quantity is a length and
the metre is the comparison standard.

Units are not decoration. They carry the dimension of the quantity. You can
change `5 m` to `500 cm` without changing the physical length, but you cannot
change it to `5 s` without changing the kind of quantity. Because equations compare or add quantities, every term that is added or set equal must have matching dimensions.

## Key Definitions

- **Physical quantity:** a measurable property such as length, time, mass, or force.
- **Numerical value:** how many units are counted.
- **Unit:** the agreed standard used for comparison.
- **Base quantity:** a quantity such as length, mass, time, electric current, temperature, amount of substance, or luminous intensity.
- **Derived quantity:** a quantity built from base quantities, such as speed in `m s^-1` or force in `kg m s^-2`.
- **Dimensional consistency:** the requirement that terms being added or equated reduce to the same base dimensions.

## Why This Matters

Every later physics calculation depends on this layer. Units catch impossible
answers, show whether two quantities can be added, and expose when a formula has
been used incorrectly.

## Canonical Examples

- Distance may be measured as `2.0 m`, `200 cm`, or `0.002 km`; the physical length is the same.
- Speed has units `m s^-1` because it is distance divided by time.
- Acceleration has units `m s^-2`, not `m s^-1`, because velocity changes per unit time.
- `s = ut + 1/2at^2` is dimensionally possible because both `ut` and `at^2` reduce to metres.
- `s = ut + 1/2at` is impossible as written because `at` reduces to `m s^-1`, not metres.

## Common Misconceptions

- Treating units as labels added after the calculation.
- Thinking the number alone is the measurement.
- Adding unlike quantities because the numerical values look compatible.
- Thinking dimensional consistency proves an equation is true; it only proves the equation has passed one necessary test.

## Problem-Solving Pattern

1. Name the physical quantity.
2. Write the numerical value with its unit.
3. Reduce derived units to base units if needed.
4. Check whether operations preserve dimensions.
5. Convert units only by multiplying by a ratio equal to one.
