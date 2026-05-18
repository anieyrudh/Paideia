# Physical Quantities and Units

This product slice establishes quantity/value/unit discipline before scalar-vector
classification and vector resolution. It now includes a learner-facing
impossible-equation detector that turns unit consistency into an interactive
lab rather than a static checklist.

## Interaction Model

The chosen interaction is an **impossible-equation detector**. Learners first
predict which familiar-looking equation cannot be right, then unlock a term-by-
term dimensional audit that compares units using base dimensions.

The lab focuses on:

- base vs derived quantities through M, L, and T exponents;
- scalar vs vector labels where the equation context needs them;
- units vs physical quantities;
- dimensional consistency for addition and equality;
- why units can rule out invalid equations even before substitution.

## Surfaces

- `container.yaml` declares the simulation-ready container and prediction gate.
- `concept-card.md` gives the first-principles explanation.
- `concept-map/` links this concept to Scalars and Vectors and Resolving Vectors.
- `simulation/` contains the impossible-equation detector contract and runtime metadata.
- `problem-solving/` contains the unit consistency algorithm and transfer task.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.
