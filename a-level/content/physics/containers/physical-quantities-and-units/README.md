# Physical Quantities and Units

This is a product-quality A-Level Physics vertical slice for the first
foundations concept. It establishes quantity/value/unit discipline through an
impossible-equation detector that turns SI base dimensions into a visible check.

## Interaction Model

Learners first predict which proposed equation is impossible. After committing,
they can switch between equation cards and inspect the detector's reasoning:
left-side unit, right-side expanded dimensions, whether addition is legal, and
whether scalar/vector direction has been preserved.

## Surfaces

- `container.yaml` declares the reviewed simulation-enabled container.
- `concept-card.md` gives the first-principles explanation and connects it to the detector.
- `concept-map/` links this concept to Scalars and Vectors and Resolving Vectors.
- `simulation/` contains the impossible-equation detector spec, runtime metadata, and gate contract.
- `problem-solving/` contains the dimensional consistency algorithm and transfer task.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.
