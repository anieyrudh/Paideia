---
subject: freshmore
concept: vector-transformations
branch: sutd
level: "Freshmore"
syllabus_ref: "SUTD Freshmore Mathematics / Linear Algebra"
prerequisites:
  - vectors
  - matrix-multiplication
aid_types:
  - simulation
status: reviewed
---

# Vector Transformations

## First-principles explanation

A 2D matrix is a rule for moving the plane. The easiest way to read it is to
watch where the two basis arrows go: the first column shows where e1 lands, and
the second column shows where e2 lands. Any vector is built from copies of e1
and e2, so its transformed position is the same combination of those two new
landing arrows.

## Key definitions

- **Basis vector**: one of the reference arrows e1 = (1, 0) and e2 = (0, 1).
- **Matrix column**: the transformed landing position of a basis vector.
- **Linear transformation**: a rule that preserves vector addition and scalar multiplication.
- **Determinant**: the signed area scale factor of the transformation.

## Why this matters

Without the column-as-basis-image view, matrix multiplication looks like a
memory trick. With it, students can predict coordinate-frame changes, rotations,
stretching, shearing, and whether an area or direction is preserved.

## Canonical examples

- A shear matrix that keeps horizontal arrows on the same line while shifting vertical arrows.
- A quarter-turn rotation matrix that sends e1 to e2 and e2 to -e1.

## Common misconceptions

- Treating rows, rather than columns, as the moved basis vectors.
- Thinking each entry acts independently instead of combining the two moved basis arrows.

## What the student does

The student predicts the transformed x-coordinate, adjusts the input vector and
the two moved basis arrows, then reveals the computed result with the formula
shown beside the interpretation.

## Pedagogical choices and why

- **Predict format**: multiple choice for the transformed x-coordinate, because
  a wrong answer cleanly exposes whether the student combined columns or rows.
- **Manipulate variables**: the input vector and basis landings are exposed; the
  formula stays visible so the manipulation remains tied to first principles.
- **Transfer problem**: a camera coordinate-frame remap uses the same idea in a
  spatial setting rather than another bare matrix exercise.

## Misconceptions this surfaces

- **Rows are moved basis vectors** — students who use rows predict the wrong
  coordinate when a shear changes the second column.
- **Entries act independently** — the revealed formula shows that the output is
  a weighted combination of both basis-image columns.

## Notes for the teacher

Ask students to say out loud where e1 and e2 land before doing arithmetic.
Follow with eigenvector language only after they can identify a direction that
stays on its own line.
