---
subject: 10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra
concept: divergence-and-curl
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.018 Modelling Space and Systems / Multivariable Calculus
prerequisites:
  - vector-fields
  - partial-derivatives
  - line-integrals
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Divergence and Curl

Divergence and curl are local diagnostics for vector fields. For `F=<P,Q>`, divergence adds the local expansion rates `dP/dx + dQ/dy`; curl subtracts cross-variation `dQ/dx - dP/dy` to measure signed local spin.

The distinction matters because a field can have large arrows without being a source, or visible shear without being a global circular flow. The simulation makes the selected sample point explicit, then shows the two partial-derivative diagnostics side by side.

## Common misconceptions

- Arrow magnitude is not divergence; divergence is local expansion or contraction.
- Curl is local spin density, not proof that every streamline is a circle.
- A field can have zero divergence and nonzero curl, or the reverse.
