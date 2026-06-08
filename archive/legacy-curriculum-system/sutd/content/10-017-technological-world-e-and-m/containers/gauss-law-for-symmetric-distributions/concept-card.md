---
concept: gauss-law-for-symmetric-distributions
title: "Gauss Law for Symmetric Distributions"
branch: sutd
subject: 10-017-technological-world-e-and-m
level: Undergraduate
module: "10.017 Technological World: Electricity and Magnetism"
summary: "Gauss law links total electric flux through a closed surface to enclosed charge; symmetry lets that flux become a useful electric-field calculation."
---

# Gauss Law for Symmetric Distributions

## First-Principles Explanation

Electric flux counts how much electric field passes through a surface in the
normal direction. Gauss law says the total flux through any closed surface is
set only by the net charge inside that surface:

```latex
\Phi_E = \oint \vec{E}\cdot d\vec{A} = \frac{Q_{enc}}{\epsilon_0}
```

The law is true for any closed surface, but it becomes a simple field equation
only when symmetry makes `E` constant on the useful part of the surface:

```latex
\Phi_E = E A_G
```

so

```latex
E = \frac{Q_{enc}}{\epsilon_0 A_G}
```

The effective area `A_G` depends on the symmetry:

- Spherical charge: `A_G = 4 pi r^2`.
- Long line charge: `A_G = 2 pi r L`; the end caps have zero flux.
- Infinite plane charge: `A_G = 2A`; equal flux leaves the two pillbox faces.

## Why This Matters

Gauss law is a surface-choice habit, not a memorised formula list. Engineers
and physicists use it to estimate fields around charged conductors, insulating
layers, sensors, and shielded geometries before moving to less symmetric
numerical models.

## Canonical Example

A point charge of `3.2 nC` sits at the centre of a Gaussian sphere with
`r = 0.45 m`.

```latex
A_G = 4\pi(0.45\ m)^2 = 2.54\ m^2
```

```latex
\Phi_E = \frac{3.2\times10^{-9}\ C}{8.854\times10^{-12}\ F/m}
= 3.61\times10^2\ V\,m
```

```latex
E = \frac{3.61\times10^2\ V\,m}{2.54\ m^2}
= 1.42\times10^2\ V/m
```

If the sphere radius increases while the enclosed charge stays fixed, total
flux stays fixed but the field magnitude drops because the same flux is spread
over a larger area.

## Common Misconceptions

- Gauss law does not only work for spheres. Spheres, cylinders, and pillboxes
  are common because each matches a different symmetry.
- Flux is not field strength. Flux combines field magnitude, surface area, and
  orientation.
- A larger closed surface does not automatically mean more flux. Flux changes
  only when enclosed charge changes.

## Transfer

For a charged coaxial cable, choose a cylindrical Gaussian surface around the
inner conductor. The enclosed charge per metre gives flux through the curved
side, then `E = lambda / (2 pi epsilon_0 r)`.
