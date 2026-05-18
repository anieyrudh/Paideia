# Physical Quantities and Units

This is a product-quality A-Level Physics foundation container. It establishes
quantity/value/unit discipline before scalar-vector classification and vector
resolution.

## Interaction model

The learner-facing lab is a quantity map / dependency graph. Learners first
predict which speed equation is unit-consistent. Only after committing the
prediction do they unlock the map, where they can:

- inspect base quantities and derived quantities;
- compare scalar and vector quantities where relevant;
- distinguish a physical quantity from its unit;
- reduce a proposed equation to base dimensions; and
- see why units constrain which equations can be valid.

## Surfaces

- `container.yaml` declares the reviewed simulation container.
- `concept-card.md` gives the first-principles explanation and product lab framing.
- `concept-map/` links this concept to Scalars and Vectors and Resolving Vectors.
- `simulation/` contains the quantity dependency map declaration, controls, presets, runtime metadata, labels, and prediction-gate contract.
- `problem-solving/` contains the unit consistency algorithm and transfer task.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.

## Learner promise

By the end of the slice, learners should be able to reject an impossible formula
before substituting numbers because the dimensions on the two sides do not
match.
