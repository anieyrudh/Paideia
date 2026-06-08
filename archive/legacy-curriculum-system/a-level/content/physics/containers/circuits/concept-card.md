---
subject: physics
concept: circuits
branch: a-level
level: H2
syllabus_ref: "9478 / Section V / Electricity and Magnetism"
prerequisites:
  - physical-quantities-and-units
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Circuits

## First-Principles Explanation

An electric circuit is a closed conducting path in which a potential difference drives charge flow. Current is the rate of charge flow, potential difference is energy transferred per unit charge, and resistance is the opposition that links them through Ohm's law for an ohmic conductor.

The most useful first move is to decide whether components share the same current or the same potential difference. Components in series carry the same current, so their resistances add. Components in parallel share the same potential difference, so their conductances add. Once the network is reduced to one equivalent resistance, the supply current follows from `I = V / R`.

## Key Definitions

- Current: rate of charge flow, measured in ampere, A.
- Potential difference: energy transferred per unit charge, measured in volt, V.
- Resistance: ratio of potential difference to current for an ohmic conductor, measured in ohm.
- Series path: components connected end-to-end with the same current through each component.
- Parallel path: components connected across the same two nodes with the same potential difference across each branch.
- Power: rate of energy transfer, calculated by `P = IV`, `P = I^2R`, or `P = V^2/R` when the relevant values are known.

## Canonical Examples

- A lamp and resistor in series: add their resistances, then use the supply voltage to find the common current.
- Two lamps in parallel: each branch has the supply voltage, and the supply current is the sum of the branch currents.
- A protective series resistor feeding parallel devices: reduce the parallel pair first, then add the series resistor.

## Common Misconceptions

- Current is not used up by a resistor. Charge flow is conserved at a junction; energy is transferred from the circuit to the component.
- A fixed-voltage supply does not fix the current. Current depends on the equivalent resistance connected to the supply.
- Adding a resistor in parallel can reduce total resistance because it creates an extra conducting path.

## PMOE-T Loop

- Predict: decide whether adding a parallel branch raises, lowers, or leaves unchanged the supply current.
- Manipulate: set the supply voltage, series resistor, and two branch resistors.
- Observe: reveal the equivalent resistance, total current, branch currents, voltage drops, and power.
- Explain: connect the result to shared branch voltage and conductance addition.
- Transfer: analyse a charger-style branch circuit with the same reduction strategy.
