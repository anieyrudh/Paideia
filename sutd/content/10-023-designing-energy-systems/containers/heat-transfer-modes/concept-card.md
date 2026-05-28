---
subject: 10-023-designing-energy-systems
concept: heat-transfer-modes
branch: sutd
level: "10.023"
syllabus_ref: "SUTD 10.023 / Conduction, convection, and radiation"
prerequisites:
  - temperature
  - energy-conservation
aid_types:
  - simulation
status: reviewed
---

# Heat Transfer Modes

## First-principles explanation

Heat transfer is energy crossing a boundary because of a temperature
difference. The mode names describe the pathway: conduction through matter,
convection between a surface and moving fluid, and radiation by electromagnetic
emission. The same hot and cold temperatures can produce different heat-flow
rates because each pathway has different coefficients and geometry.

## Key definitions

- **Conduction:** heat flow through a material, modelled here as
  `q = k A Delta T / L`.
- **Convection:** heat flow from a surface to a fluid, modelled here as
  `q = h A Delta T`.
- **Radiation:** heat flow by emission, modelled here as
  `q = epsilon sigma A (T_hot^4 - T_cold^4)`.
- **Heat-flow rate:** power in watts. It is not the same quantity as
  temperature.

## Why this matters

Energy-system design choices target different terms. Insulation changes
conduction path length, airflow changes convection coefficient, and surface
finish changes emissivity. Treating all heat transfer as one number hides the
design lever.

## Canonical examples

- Insulated wall or duct panels.
- Cooling fins and forced convection.
- Low-emissivity surfaces on hot equipment.

## Common misconceptions

- Heat and temperature are interchangeable.
- Radiation needs air or physical contact.
- Thicker material always transfers more heat because there is more material.

## What the student does

The student predicts a heat-rate scaling claim, then manipulates temperatures,
wall thickness, convection coefficient, and emissivity to compare conduction,
convection, and radiation readouts.
