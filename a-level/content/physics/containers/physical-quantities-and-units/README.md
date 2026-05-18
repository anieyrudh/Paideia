# Physical Quantities and Units

This product slice establishes quantity/value/unit discipline with a
prediction-gated measurement and uncertainty lab. Learners choose the complete
speed record first, then manipulate raw distance, time, and uncertainty values
to see why units constrain equations.

## Interaction model

Measurement and uncertainty lab:

1. Predict which speed record is complete enough for physics.
2. Manipulate measured distance, distance uncertainty, measured time, and time uncertainty.
3. Observe a notebook-style record with quantity classification, unit reasoning, and uncertainty propagation.
4. Explain why `m ÷ s` gives `m s^-1`, why `m + s` is invalid for speed, and why measured values need uncertainty.

## Surfaces

- `container.yaml` declares the reviewed interactive container and package-level prediction.
- `concept-card.md` gives the first-principles explanation and lab framing.
- `concept-map/` links this concept to Scalars and Vectors and Resolving Vectors.
- `simulation/` contains the measurement-and-uncertainty lab declaration and route-facing entry.
- `problem-solving/` contains the unit consistency and measured-record algorithm.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.

## Learner-facing promise

The UI avoids implementation terms and focuses on the lab notebook: physical
quantity, value, uncertainty, unit, base/derived status, scalar/vector status,
and dimensional consistency.
