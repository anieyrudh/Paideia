---
concept: capacitor-with-dielectric
title: "Capacitor with Dielectric"
branch: sutd
subject: 10-017-technological-world-e-and-m
level: Undergraduate
module: "10.017 Technological World: Electricity and Magnetism"
summary: "A dielectric increases the charge a parallel-plate capacitor stores per volt by changing the material proportionality between plate geometry and capacitance."
---

# Capacitor with Dielectric

## First-Principles Explanation

A capacitor stores separated charge. In a parallel-plate model, the plates give
the geometry and the material in the gap gives the polarisation response.

The ideal capacitance is:

```latex
C = \frac{\kappa \epsilon_0 A}{d}
```

where `kappa` is the dielectric constant, `epsilon_0` is vacuum permittivity,
`A` is plate overlap area, and `d` is plate separation. The equation says that
wider overlap gives more room for separated charge, a smaller gap needs less
voltage for the same field, and a larger dielectric constant lets bound charges
inside the material partially oppose the plate field.

Once capacitance is set, the charge and stored electric energy follow:

```latex
Q = CV
```

```latex
U = \frac{1}{2}CV^2
```

At fixed voltage, increasing `kappa` increases `C`, so both stored charge and
stored energy increase in the same proportion. The battery supplies the extra
charge and energy as the material is inserted.

## Why This Matters

Dielectrics are how real capacitors become compact enough for electronics,
sensors, power conditioning, and energy storage. A designer cannot choose
capacitance from voltage alone. They must trade area, thickness, material
constant, field strength, insulation limits, and energy density.

## Canonical Example

A capacitor has `A = 0.0080 m^2`, `d = 0.0010 m`, `V = 12 V`, and `kappa = 3`.

```latex
C =
\frac{(3)(8.854\times10^{-12}\ F/m)(0.0080\ m^2)}
{0.0010\ m}
= 2.13\times10^{-10}\ F
```

```latex
Q = (2.13\times10^{-10}\ F)(12\ V)
= 2.55\times10^{-9}\ C
```

```latex
U = \frac{1}{2}(2.13\times10^{-10}\ F)(12\ V)^2
= 1.53\times10^{-8}\ J
```

The electric field magnitude is `E = V/d = 12,000 V/m`.

## Common Misconceptions

- A dielectric does not block all field lines. It polarises, reducing the field
  per unit free charge and allowing more charge at the same voltage.
- Capacitance is not set by the battery. The battery sets voltage; geometry and
  material set capacitance.
- Fixed voltage does not mean fixed stored energy. If capacitance changes while
  voltage is held constant, stored energy changes.

## Transfer

For a capacitive sensor pad, use the same equations but treat field strength as
a design constraint: `E = V/d` must stay below the material limit while `C`
must be high enough for the sensing circuit.
