---
subject: asd
concept: structural-load-path-diagram
branch: sutd
level: Undergraduate
syllabus_ref: "SUTD ASD / Structural systems / Load paths and bracing"
prerequisites:
  - load-path-and-daylight-tradeoff
  - free-body-diagram-mechanics
  - vector-resolution
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Structural Load Path Diagram

## First-Principles Explanation

A structural load path is the connected route by which an applied load becomes member forces and then support reactions. A diagram is complete only when every applied load has a named path to ground and the external reactions close equilibrium.

For a braced bay, a sideways load enters the roof diaphragm, travels into a diagonal brace or frame action, and reaches the foundations through column and base reactions. The diagonal member is not assigned an arbitrary share of load. Its axial force is set by geometry: the horizontal component of the diagonal force must balance the sideways load.

## Key Definitions

- Load path: the sequence of members and joints that carries a load to supports.
- Free-body diagram: an isolated body with all external loads and reactions shown.
- Axial force: tension or compression along a member's centreline.
- Support reaction: the force supplied by a support to close equilibrium.
- Overturning: the moment from a lateral load that shifts vertical reactions between supports.

## Canonical Examples

- A wind load on a braced studio bay enters the roof beam, resolves into a diagonal brace, and changes the two base reactions.
- A canopy under side wind can have a small gravity load but a large overturning shift, creating uplift at the windward base.
- A facade frame with a missing brace forces lateral load through bending and can overstress columns even when gravity loads are modest.

## Common Misconceptions

- Loads do not vanish at the ground. Supports supply equal and opposite reactions that must appear in the free-body diagram.
- Visible members do not carry equal force by default. Geometry and connectivity determine which members are in tension, compression, bending, or near-zero force.
- A thicker member does not fix an unclear load path. Capacity helps only after the load has a continuous route to the support.

## Formula Core

For a diagonal brace at angle `theta`, the horizontal component of the brace force balances a sideways load `H`:

```latex
F_b = \frac{H}{\cos(\theta)}
```

The support reaction shift from overturning is:

```latex
\Delta R = \frac{Hh}{L}
```

where `h` is storey height and `L` is bay width. The two vertical reactions become `W/2 - Delta R` and `W/2 + Delta R` for a symmetric gravity load `W`.

## Why This Matters

Architectural drawings often show form before forces. Load-path diagrams keep structural reasoning visible: they show whether a proposed bay has a continuous force route, whether the governing member is axial or bending dominated, and whether the foundation reactions are still physically plausible.
