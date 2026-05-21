---
subject: physics
concept: capacitance
branch: a-level
level: H2
syllabus_ref: "9478 / Section V / Electricity and Magnetism"
prerequisites:
  - electric-fields
  - circuits
  - exponential-change
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Capacitance

## First-Principles Explanation

A capacitor stores energy by separating equal and opposite charge onto two conductors. The supply does work to move charge from one plate to the other, creating an electric field in the space between the plates.

Capacitance measures how much charge separation is produced per volt:

```text
C = Q / V
```

Rearranged, the stored charge is:

```text
Q = CV
```

The capacitor does not create net charge. One plate has +Q and the other has -Q, so the charge named in formulae is the magnitude of separated charge on either plate.

The energy stored in the field is:

```text
U = 1/2 QV = 1/2 CV^2
```

When a charged capacitor discharges through a resistor, the voltage and charge fall exponentially:

```text
V(t) = V0 e^(-t/RC)
```

The product RC is the time constant. After one time constant, the capacitor keeps about 37 percent of its starting voltage and charge.

## Key Definitions

- **Capacitance, C:** charge separated per unit potential difference, measured in farads.
- **Stored charge, Q:** magnitude of charge on either plate, measured in coulombs.
- **Potential difference, V:** energy transferred per unit charge by the supply, measured in volts.
- **Stored energy, U:** energy in the electric field between the plates, measured in joules.
- **Time constant, tau:** RC for a resistor-capacitor discharge, measured in seconds.

## Canonical Examples

- At fixed voltage, doubling capacitance doubles stored charge and doubles stored energy.
- At fixed capacitance, doubling voltage doubles stored charge but quadruples stored energy.
- A 470 microF capacitor at 6.0 V stores Q = (470 x 10^-6 F)(6.0 V) = 2.82 x 10^-3 C.
- A larger discharge resistance gives a larger time constant, so the capacitor voltage falls more slowly.

## Common Misconceptions

- **Capacitance changes just because charge changes:** C is the ratio Q/V for the capacitor; increasing Q by raising V does not by itself change C.
- **A charged capacitor has created charge:** the plates hold equal and opposite charge, so the net charge of the capacitor can remain zero.
- **Discharge removes equal amounts in equal times:** exponential discharge removes equal fractions in equal time intervals.

## Why This Matters

Capacitance is the bridge between electric fields, circuits, and stored energy. It explains camera flashes, smoothing in power supplies, timing circuits, sensor plates, and why energy in electric fields depends strongly on potential difference.
