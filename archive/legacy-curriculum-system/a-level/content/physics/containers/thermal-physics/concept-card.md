---
subject: physics
concept: thermal-physics
branch: a-level
level: H2
syllabus_ref: "9478 / Section III / Thermal Physics"
prerequisites:
  - physical-quantities-and-units
  - work-energy-power
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Thermal Physics

## First-Principles Explanation

Temperature is a state variable that tells the direction of net energy transfer
by heating. Two bodies at the same temperature are in thermal equilibrium: no
net thermal energy flows between them. Thermal energy transfer is not the same
quantity as temperature; the energy needed to change a body's temperature also
depends on its mass and material.

```latex
Q = mc\Delta T
```

For gases, the thermodynamic temperature scale is essential. The ideal-gas law
uses kelvin because it is proportional to the average translational kinetic
energy of gas particles in the ideal model. A Celsius value must be converted
before it is used in `pV = nRT`.

```latex
T_\mathrm{K} = T_{^\circ\mathrm{C}} + 273.15
```

```latex
pV = nRT
```

## Key Definitions

- **Thermal equilibrium:** condition where bodies in contact have no net energy transfer by heating.
- **Thermodynamic temperature:** absolute temperature measured in kelvin.
- **Internal energy:** total microscopic kinetic and potential energy of the particles in a system.
- **Specific heat capacity:** energy needed per kilogram per kelvin temperature change.
- **Ideal gas:** model gas obeying `pV = nRT`, with negligible molecular volume and no intermolecular forces except during collisions.
- **Amount of substance:** number of moles, where one mole contains Avogadro's number of particles.

## Why This Matters

Thermal physics links thermometer readings to particle models, gas pressure,
energy transfer, and engineering decisions such as heating, insulation, weather
balloons, engines, and compressed gas storage. The topic is also a common exam
trap because Celsius temperatures feel familiar but are not valid inputs to gas
laws.

## Canonical Examples

- Convert 27 deg C to 300.15 K before using `pV = nRT`.
- At fixed amount and temperature, halving the gas volume doubles the pressure.
- Heating 0.25 kg of water from 20 deg C to 60 deg C needs much more energy than heating a smaller sample through the same temperature rise.
- A weather balloon expands as external pressure falls, while gas temperature and amount also affect the volume.

## Common Misconceptions

- Treating temperature as the amount of thermal energy in the body.
- Substituting Celsius directly into `pV = nRT`.
- Saying a larger gas volume must always mean a larger pressure.
- Forgetting that a temperature change in deg C has the same size as a temperature change in K.

## Problem-Solving Pattern

1. Identify whether the task is about gas state, energy transfer, or both.
2. Convert every absolute gas-law temperature to kelvin.
3. Choose the formula: `pV = nRT` for an ideal gas state, `Q = mc Delta T` for heating or cooling.
4. Substitute with units and keep pressure-volume units consistent.
5. Interpret the sign and size: pressure responds to `nT/V`, while thermal energy transfer responds to `mc Delta T`.
