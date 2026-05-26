---
subject: "10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra"
concept: double-and-triple-integrals
branch: sutd
level: Undergraduate
syllabus_ref: SUTD 10.018 Modelling Space and Systems / double and triple integrals
prerequisites:
  - single-variable-integration
  - regions-and-bounds
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Double and Triple Integrals

## First-Principles Explanation

A single integral accumulates along a line. A double integral accumulates over
area:

```latex
\iint_R \rho(x,y)\,dA
```

If \(\rho=1\), the result is area. If \(\rho\) is mass density, charge density,
or probability density, the result is the accumulated quantity over the region.

A triple integral accumulates through volume:

```latex
\iiint_B \rho(x,y,z)\,dV
```

For a constant-height box and a density that depends only on \(x,y\), the triple
integral can be read as stacked copies of the base double integral.

## Why It Matters

SUTD modelling uses multiple integrals for mass, centre of mass, probability,
flux preparation, heat generation, and material usage. The key habit is tying
the bounds to the region and the units to the density.

## Canonical Example

For \(\rho(x,y)=2\) on \(0\le x\le3\), \(0\le y\le2\),

```latex
\iint_R 2\,dA=2(3)(2)=12
```

Stacking that base through height \(h=4\) gives \(48\) accumulated units.

## Common Misconceptions

- A double integral is not only area; it is area accumulation of the integrand.
- Bounds describe the actual region, so they must change when the region or
  order changes.
- Triple integrals are not automatically harder; sometimes they are stacked
  copies of a simpler slice.
