# Physical Quantities and Units

This container is the product-quality prerequisite slice for the first A-Level
Physics mini graph. It establishes quantity/value/unit discipline before
scalar-vector classification and vector resolution.

## Interaction model: Unit Classification Lab

The learner first predicts what is wrong with a lab note that records
acceleration as `9.8 m s^-1`. After committing, the lab opens a focused sorter:

- choose a physical quantity card;
- classify it as base or derived;
- decide whether it is scalar or vector where relevant;
- test whether an equation is allowed by its units;
- read the unit-balance reasoning behind the verdict.

## What this version optimizes for

- Fast misconception surfacing: units are not decoration, and a number without a
  unit is not a complete measurement.
- Product clarity: the learner sees cards, balances, and short reasoning rather
  than implementation details.
- Transfer readiness: the same unit discipline feeds Scalars and Vectors,
  Resolving Vectors, kinematics, forces, and energy.

## Container surfaces

- `container.yaml` declares the reviewed product slice, prediction gate, sim,
  embed API, transfer task, and Filter metadata.
- `concept-card.md` gives the first-principles explanation and lab rationale.
- `concept-map/` links this concept to Scalars and Vectors and Resolving Vectors
  and records misconception relationships.
- `simulation/` owns the Unit Classification Lab metadata and prediction-gate
  contract.
- `problem-solving/` contains the unit consistency algorithm and transfer task.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.

## Author + date + advisor sign-offs

- Author: Anieyrudh R
- Productization: 2026-05-17
- Advisor sign-offs: none yet
