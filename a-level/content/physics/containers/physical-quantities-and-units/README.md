# Physical Quantities and Units

Product-quality A-Level Physics foundation slice for unit discipline and
dimensional consistency. The container now uses a prediction-gated dimensional
consistency checker: learners predict which equation is impossible, then test
formula claims by reducing both sides to SI base dimensions.

## Interaction Model

**Dimensional consistency checker.** The lab optimizes for fast conceptual
feedback: a learner chooses or builds an equation, sees how units combine, and
receives a verdict before doing any numerical substitution. Quantity cards make
base vs derived and scalar vs vector status visible without exposing code or
implementation details.

## Learner Outcomes

- Distinguish physical quantities, numerical values, and units.
- Classify common examples as base or derived quantities.
- Notice that scalar/vector status is not decided by unit text alone.
- Use dimensions to decide whether equations and additions are possible.
- Explain why units constrain valid equations.

## Surfaces

- `container.yaml` declares the reviewed simulation-backed container.
- `concept-card.md` gives the first-principles explanation and lab framing.
- `concept-map/` links misconceptions to the checker and downstream vector work.
- `simulation/` contains the dimensional consistency checker contract and runtime metadata.
- `problem-solving/` contains the dimensional consistency algorithm and transfer task.
- `embed/` exposes the standard host API with checker state.
- `media/` provides thumbnail and fallback visuals for the product slice.
