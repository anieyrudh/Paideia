# Physical Quantities and Units

This container is a product-quality learner-facing slice for the first A-Level physics mini graph. It establishes quantity/value/unit discipline through an **impossible-equation detector** before learners move on to scalar-vector classification and vector resolution.

## Interaction Model

Learners predict whether `s = ut + 1/2at` can be valid using units only. After committing a prediction and rationale, they can select proposed equations and inspect how each term reduces to base dimensions. The detector highlights why mismatched dimensions make an equation impossible, while reminding learners that matching dimensions are necessary but not enough to prove an equation true.

## Surfaces

- `container.yaml` declares the draft interactive container, prediction prompt, simulation, transfer task, and review gates.
- `concept-card.md` gives the first-principles explanation for quantities, units, base/derived quantities, scalar/vector properties, and dimensional consistency.
- `concept-map/` links this concept to Scalars and Vectors, Resolving Vectors, and the misconception graph targeted by the detector.
- `simulation/` contains the prediction-gated impossible-equation detector contract and runtime metadata.
- `problem-solving/` contains the unit consistency algorithm and transfer task.
- `embed/` exposes the standard host API with selected-equation and prediction progress state.
- `media/` provides thumbnail and fallback visuals.

## Learner Promise

By the end of the slice, a learner should be able to say: "A unit is part of the quantity, not decoration. If two terms are added or equated, their base dimensions must match. If they do not match, the equation is impossible as written."
