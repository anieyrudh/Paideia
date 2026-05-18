# Physical Quantities and Units

This container is the learner-facing prerequisite slice for the first A-Level
physics mini graph. It establishes quantity/value/unit discipline before
scalar-vector classification and vector resolution, then turns that discipline
into a prediction-gated measurement and uncertainty lab.

## Interaction Model

The chosen model is a **measurement and uncertainty lab**. Learners first
predict the unit of average speed. After committing their prediction, they tune
a trolley distance, timing, and measurement uncertainties. The lab shows how the
measurement record becomes:

- a quantity with value, unit, and uncertainty;
- a derived scalar quantity;
- a dimensionally valid equation, `average speed = distance / time`;
- a unit chain, `m / s = m s^-1`; and
- an uncertainty estimate that remains attached to the calculated unit.

## Surfaces

- `container.yaml` declares the draft interactive container and its prediction-gated sim.
- `concept-card.md` gives the first-principles explanation and lab framing.
- `concept-map/` links measurement, units, uncertainty, dimensional consistency, Scalars and Vectors, and Resolving Vectors.
- `simulation/` exposes the Measurement and Uncertainty Lab surface.
- `problem-solving/` contains the unit consistency and measurement-uncertainty transfer tasks.
- `embed/` exposes the standard host API.
- `media/` provides thumbnail and fallback visuals.
- `TECHNICAL.md` records architecture decisions, validation notes, and the Anieyrudh Filter pass.
