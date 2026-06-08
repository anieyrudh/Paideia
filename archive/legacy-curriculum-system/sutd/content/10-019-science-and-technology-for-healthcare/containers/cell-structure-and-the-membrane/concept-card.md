---
subject: 10-019-science-and-technology-for-healthcare
concept: cell-structure-and-the-membrane
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Cell structure and the membrane
prerequisites:
  - cell-anatomy
  - concentration-gradients
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Cell Structure and the Membrane

The plasma membrane is not a passive wall. It is a selectively permeable interface that lets different ions cross at different rates. Because each ion has its own electrochemical gradient, the membrane's per-ion permeability picks which gradient ends up dominating the cell's resting voltage.

Two equations carry most of the introductory weight. The Nernst equation gives the equilibrium voltage `E_ion` for a single ion of charge `z` at body temperature:

```latex
E_{\text{ion}}
= \frac{R T}{z F} \ln\!\left(\frac{[\text{ion}]_{\text{out}}}{[\text{ion}]_{\text{in}}}\right)
```

The Goldman-Hodgkin-Katz (GHK) equation extends Nernst to the case where several monovalent ions cross with different permeabilities:

```latex
V_m
= \frac{R T}{F} \ln\!\left(
  \frac{P_K\,[\text{K}^+]_{\text{out}} + P_{\text{Na}}\,[\text{Na}^+]_{\text{out}} + P_{\text{Cl}}\,[\text{Cl}^-]_{\text{in}}}
       {P_K\,[\text{K}^+]_{\text{in}} + P_{\text{Na}}\,[\text{Na}^+]_{\text{in}} + P_{\text{Cl}}\,[\text{Cl}^-]_{\text{out}}}
\right)
```

The membrane decides which ion's Nernst potential the cell sits near. When K+ permeability dominates, the resting voltage is close to the K+ Nernst potential (around -90 mV at body temperature for textbook physiological concentrations). When Na+ permeability rises (as during an action potential's rising phase), the voltage swings toward the Na+ Nernst potential (around +60 mV).

## First-Principles Explanation

A pure concentration gradient stores energy. Letting one ion cross unloads that gradient into electrical work; the voltage builds until the electrical force balances the diffusive force exactly. That equilibrium is the Nernst potential.

For a multi-ion membrane, no single Nernst potential is satisfied at once. The cell settles at a weighted compromise: ions with high permeability pull the voltage toward their own Nernst potential. Permeability is the weight. This is exactly what the GHK equation expresses.

Cell **geometry** sets the rate of approach. A small cell with high surface-area-to-volume ratio equilibrates with its bath quickly; a large compartment takes longer. The Fick first-law steady flux `J = P (C_out - C_in)` ties the membrane's permeability and the gradient to the molar flow per unit area per unit time.

## Canonical Example

For a textbook resting cell at 37 degC with the standard physiological concentrations and a K-dominant permeability (`P_K : P_Na : P_Cl ~ 1 : 0.04 : 0.45`), GHK gives a resting voltage between -90 mV (the K+ Nernst potential) and roughly -70 mV. Lowering K+ permeability or raising Na+ permeability shifts the voltage toward zero or positive, which is the qualitative move the simulation makes interactive.

## Common Misconceptions

- The membrane is not a passive wall. Without selectivity the resting voltage would be zero.
- Resting voltage does not depend on cell volume. A bigger compartment takes longer to equilibrate, but the steady-state voltage depends on permeability ratios, not on size.
- "Polar molecules cannot cross at all" is too strong. Specialised channels move water (aquaporins) and small polar solutes through the bilayer.
- Pumps versus channels: an ATP-driven pump moves ions against their gradients and is not the same primitive as a selectively permeable channel.

## Transfer

The same Nernst + GHK reasoning carries directly into action potentials (where Na+ permeability transiently dominates), into renal tubule reabsorption, and into the Donnan equilibria that arise inside organelles. Each downstream container picks up where this one leaves off: by treating the membrane as a permeability-weighted decision-maker.
