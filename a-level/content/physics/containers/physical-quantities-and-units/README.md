# Physical Quantities and Units

This product slice teaches learners to turn a number into a complete physics
measurement and to use units as a quick test for valid equations.

## Interaction model

The container now uses a **unit classification lab**. Students first commit a
prediction about which unit-reading mistake they expect to make, then unlock an
interactive deck of quantity cards and an impossible-equation detector.

## What the student does

- Predicts which unit-reading mistake they are most likely to make before opening the lab.
- Chooses quantity cards and compares base/derived plus scalar/vector labels.
- Reads the SI unit and dimension for each quantity.
- Uses formula-backed unit reasoning such as `speed = distance ÷ time`.
- Tests equations by checking whether the left and right dimensions match.
- Transfers the method to an acceleration unit error in a lab note.

## Pedagogical choices and why

The lab keeps the first screen focused on a likely measurement-reading mistake instead of a
memorisation table. The reveal shows why units are not labels added after a
calculation: they constrain what quantities can mean and which equations can be
valid.

## Citations and provenance

See `sources.md`. This package is original Paideia content aligned to SEAB 9478
H2 Physics Section I, learning outcomes 1(a)-1(g).

## Container surfaces

- `container.yaml` owns identity, authoring metadata, capabilities, and embed API contract.
- `concept-card.md` owns first-principles explanation and misconceptions.
- `concept-map/` owns prerequisites, downstream links, misconception graph, and Mermaid source.
- `simulation/` owns the unit classification lab, controls, presets, runtime metadata, and state labels.
- `embed/` owns the standalone host API.
- `media/` owns fallback visuals and thumbnails.
- `problem-solving/` owns the stepwise strategy and transfer problem.

## Author + date + advisor sign-offs

- Author: Anieyrudh R
- Productized: 2026-05-17
- Advisor sign-offs: none yet
