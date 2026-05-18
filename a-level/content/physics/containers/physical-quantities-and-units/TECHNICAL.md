# Technical Notes

## Architecture

This container is now a simulation-backed product slice. The learner-facing
surface is the dimensional consistency checker exported from
`@paideia/a-level-physics-sims/dimensional-consistency` and re-exported through
`simulation/index.tsx`.

The simulation is wrapped in `PredictionGate`. The equation checker, quantity
cards, dimensional verdict, and formula reasoning are children of the gate, so
the Observe/Explain content does not enter the DOM until the learner commits a
prediction and rationale.

Reusable calculation logic lives in the A-Level physics sims package rather than
inside the container directory:

- dimension vectors for common A-Level foundation quantities;
- multiplication/division exponent rules;
- addition/equality consistency checks;
- learner-facing dimension formatting.

No schema or validator changes were made.

## Interaction Model

The chosen interaction is a **dimensional consistency checker**. This version
optimizes for the first product slice in a physics sequence: learners should be
able to catch impossible equations before learning heavier mechanics. The lab
connects quantity/value/unit discipline to later scalar-vector work by showing
that speed and velocity can share units while differing in whether direction is
part of the quantity.

## Prediction-Gate Leak Review

Self-review result: no answer-revealing checker output is rendered before the
prediction gate. Before commitment, learners see only the prediction prompt,
multiple-choice options, and rationale field. After commitment, the lab reveals
unit cards, verdicts, and dimensional reasoning.

## Student-Facing Copy Review

The UI copy refers to equations, quantities, units, dimensions, and physical
meaning. It does not mention source files, package names, YAML, kernels, schemas,
or generated artifacts.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` with `predict_at: both` and a declared simulation.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec` and keeps downstream links to Scalars and Vectors and Resolving Vectors.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares `core/prediction-gate` and `core/ui-sim` dependencies.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- `simulation/simulation.test.ts` contains the required prediction-gate contract marker.

## Failures and Fixes Recorded

- Fixed the container lifecycle from `content-only` / no predict path to `reviewed` with a declared simulation and non-empty filter output.
- Fixed embed state to track checker scenario and prediction completion instead of the old content-only selected example.
- Added simulation metadata files that were previously absent because the container was content-only.
- Fixed a new sim contract expectation that looked for the force dimension in the default impossible-addition case; the default case correctly surfaces `L T^-1` and `T`.
- Fixed `simulation.yaml` to use the schema-supported `decision-matrix` interaction type instead of an unsupported equation-checker label.
- Playwright browser installation was attempted for shell/sim-harness checks, but the CDN returned HTTP 403; browser-dependent tests remain environment-blocked rather than code-blocked.

## Anieyrudh Filter pass

Date: 2026-05-17

### P0 checks

- **Prediction gate:** Pass. The checker and all verdict text are gated behind `PredictionGate`.
- **Answer leaks:** Pass. The pre-gate prompt asks for a prediction but does not render the checker verdict or dimensional working.
- **Student-facing UI:** Pass. Copy avoids implementation details and uses classroom-facing language.
- **Container shape:** Pass in design. All required simulation, embed, media, concept-map, and problem-solving surfaces are present.
- **Schema discipline:** Pass. No schema or validator weakening.

### P1 checks

- **Engagement:** Pass. The lab offers presets plus a custom equation builder and visual quantity cards.
- **Concept coverage:** Pass. The interaction distinguishes base/derived, units/quantities, scalar/vector where relevant, and dimensional consistency.
- **Transfer readiness:** Pass. The transfer problem connects the same dimension-checking idea to acceleration units.
- **Tradeoff:** Deferred. The checker intentionally covers a compact set of introductory quantities rather than a full symbolic algebra parser.
