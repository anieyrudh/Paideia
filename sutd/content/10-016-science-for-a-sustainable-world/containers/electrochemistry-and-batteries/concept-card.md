---
subject: 10-016-science-for-a-sustainable-world
concept: electrochemistry-and-batteries
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.016 Science for a Sustainable World / electrochemistry and batteries
prerequisites:
  - thermochemistry-and-equilibrium
  - chemical-bonding-and-intermolecular-forces
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: draft
---

# Electrochemistry and Batteries

## First-Principles Explanation

A galvanic cell turns a spontaneous redox reaction into electrical work. The
standard cell potential `E0` describes the cell under standard conditions. Real
cells are not always at standard composition, so the reaction quotient `Q`
changes the available voltage.

```latex
E = E^\circ - \frac{RT}{nF}\ln Q
```

When products build up, `Q` increases. The logarithm term becomes larger, so it
subtracts more from the standard potential. That is why cell voltage can sag as
a battery discharges, even when the electrode pair has not changed.

## Key definitions

- **Oxidation**: loss of electrons at the anode.
- **Reduction**: gain of electrons at the cathode.
- **Cell potential**: voltage available from the redox reaction.
- **Reaction quotient**: current composition ratio for products and reactants.
- **Electron count**: number of electrons transferred in the balanced redox
  reaction.

## Common misconceptions

- The label voltage is not a promise that voltage never changes.
- Product build-up does not automatically mean more voltage; the Nernst sign
  makes high `Q` reduce voltage for a galvanic cell.
