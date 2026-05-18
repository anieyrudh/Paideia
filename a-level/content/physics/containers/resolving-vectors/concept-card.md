---
subject: physics
concept: resolving-vectors
branch: a-level
level: H2
syllabus_ref: "9478 / Section I / 1(j)"
prerequisites:
  - physical-quantities-and-units
  - scalars-and-vectors
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Resolving Vectors

## First-Principles Explanation

A vector can be replaced by perpendicular components along chosen axes. The
components are not extra vectors added to the original; together they are an
equivalent representation of the same vector.

The angle reference comes first. If the angle is measured from the horizontal,
the horizontal component is adjacent to the angle and the vertical component is
opposite the angle. If the angle is measured from the vertical, those roles
switch.

For a vector of magnitude `R` at angle `theta` above the horizontal:

```text
x = R cos theta
y = R sin theta
```

The formula follows from the right-triangle labels, not from memorising sine
and cosine as fixed words.

## Key Definitions

- **Component:** the part of a vector along a chosen axis.
- **Resolving:** replacing a vector by perpendicular components.
- **Axis:** a chosen direction used to describe components.
- **Resultant:** the single vector equivalent to adding components.

## Why This Matters

Most force and motion problems become simpler when vectors are written in
components. Once the axes are chosen, horizontal and vertical effects can be
handled separately while preserving the original direction information.

## Canonical Examples

- A shallow upward pull has a larger horizontal component than vertical component when the angle is measured from the horizontal.
- A vertical vector has zero horizontal component.
- If the angle is measured from the vertical instead, the sine/cosine roles switch.

## Common Misconceptions

- Swapping sine and cosine because the angle reference was not checked.
- Adding the components to the original vector as if they are extra forces.
- Dropping units from components even though each component has the same unit as the original vector.

## Problem-Solving Pattern

1. Draw the vector and mark the angle reference.
2. Choose perpendicular axes.
3. Identify adjacent and opposite sides.
4. Apply `x = R cos theta`, `y = R sin theta` for an angle from the horizontal.
5. Keep the original unit on both components.
