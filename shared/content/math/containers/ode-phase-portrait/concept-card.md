---
subject: math
concept: ode-phase-portrait
branch: shared
level: "Shared core"
syllabus_ref: "Shared mathematics / Dynamical systems / Phase portraits"
prerequisites:
  - derivatives
  - vector-fields
  - linear-algebra
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# ODE Phase Portrait

## First-Principles Explanation

A phase portrait shows how a system changes when its current state is a point in
the plane. For a two-variable ODE, each point `(x, y)` has an arrow `(x', y')`.
An equilibrium is only a point where that arrow is zero. The surrounding arrows
still matter: they tell whether a nearby disturbance returns, escapes, spirals,
or splits along different directions.

## Key Definitions

- **State**: the pair `(x, y)` that records the two quantities being modelled.
- **Vector field**: the rule that assigns the rate pair `(x', y')` to each state.
- **Equilibrium**: a state where both rates are zero, so the state stays fixed if it starts exactly there.
- **Trace**: the sum of diagonal entries in a 2 by 2 linear system matrix.
- **Determinant**: the area-scale quantity `ad - bc` for a 2 by 2 matrix.
- **Discriminant**: the value `trace^2 - 4 determinant`, used to decide whether eigenvalues are real or complex.

## Why This Matters

Many SMT models first appear as coupled rates: concentrations, temperatures,
populations, charge states, or mechanical coordinates. The phase portrait lets
students reason about stability before solving every equation exactly. It turns
"what happens next?" into a local geometry question.

## Canonical Examples

- A damped oscillator has arrows that spiral inward because disturbances lose energy and return toward equilibrium.
- A saddle has one direction that approaches and another that escapes, so a tiny change can switch long-term behaviour.
- A centre circles around the equilibrium because the restoring effect is present but damping is absent.

## Common Misconceptions

- Treating the equilibrium as a region where all nearby arrows are also zero.
- Reading phase-plane arrows as literal physical positions rather than rates of change for state variables.
- Assuming every stable system approaches along a straight line instead of checking whether the eigenvalues are complex.

## What The Student Does

The student predicts the default stability behaviour, adjusts trace,
determinant, and the initial state, then reveals the classification, formula
substitution, vector-field sketch, and trajectory. The final prompt transfers
the same trace-determinant reasoning to a reactor operating point.

## Pedagogical Choices And Why

- **Predict format**: multiple choice, because the default system has a clear
  stable-spiral answer and the wrong choices expose common misconceptions about
  equilibrium and divergence.
- **Manipulate variables**: trace and determinant are exposed directly so the
  student sees how classification regions change without symbolic clutter.
- **Observation**: the reveal includes both the formula trail and the plotted
  field so arithmetic and geometry stay connected.
- **Transfer**: the reactor prompt changes the domain language while preserving
  the same local linear stability decision.

## Misconceptions This Surfaces

- **Equilibrium means nothing changes anywhere**: moving the initial state away
  from the origin shows non-zero arrows surrounding a zero-rate point.
- **Arrows show only physical velocity**: the labels keep the axes as state
  variables and rates, not literal position in a room.

## Notes For The Teacher

Ask students to classify from trace, determinant, and discriminant before they
look at the plotted path. Then ask which single sign change would move the
system across a stability boundary.
