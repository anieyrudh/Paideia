---
concept: magnetic-induction-faraday-lenz
title: "Magnetic Induction: Faraday-Lenz"
branch: sutd
subject: 10-017-technological-world-e-and-m
level: Undergraduate
module: "10.017 Technological World: Electricity and Magnetism"
summary: "Faraday's law gives the size of induced emf from changing magnetic flux; Lenz's law gives the direction by opposing the flux change."
---

# Magnetic Induction: Faraday-Lenz

## First-Principles Explanation

Magnetic induction starts from magnetic flux, the part of a magnetic field that
passes through a loop. For a uniform field and a flat loop:

```latex
\Phi = BA\cos\theta
```

`B` is magnetic flux density, `A` is loop area, and `theta` is the angle between
the field and the loop normal. A larger field, larger loop, or more face-on
orientation gives more flux.

Faraday's law says an emf is induced when flux changes:

```latex
\mathcal{E} = -N\frac{\Delta\Phi}{\Delta t}
```

The magnitude grows with more turns, larger flux change, or shorter change time.
The minus sign is Lenz's law: the induced emf drives a current whose magnetic
effect opposes the change in flux. It does not simply oppose the field. If flux
out of the page is increasing, the induced field points into the page. If flux
out of the page is decreasing, the induced field points out of the page to
preserve it.

## Why This Matters

Generators, wireless chargers, guitar pickups, induction cookers, braking
systems, and transformers all rely on changing flux. The design question is not
only "how big is the field?" but "how fast does flux through the circuit change,
and what current direction will oppose that change?"

## Canonical Example

A `40` turn coil of area `0.0120 m^2` sees the field normal to the loop change
from `0.100 T` to `0.500 T` in `0.300 s`.

```latex
\Phi_i = (0.100\ T)(0.0120\ m^2) = 1.20\times10^{-3}\ Wb
```

```latex
\Phi_f = (0.500\ T)(0.0120\ m^2) = 6.00\times10^{-3}\ Wb
```

```latex
\mathcal{E}
= -(40)\frac{4.80\times10^{-3}\ Wb}{0.300\ s}
= -0.640\ V
```

The magnitude is `0.640 V`. If the circuit resistance is `8.0 ohm`, the current
magnitude is `0.080 A`. The sign tells the chosen loop orientation; the Lenz
claim is that the induced magnetic effect opposes the increase in flux.

## Common Misconceptions

- Lenz's law opposes the change in flux, not necessarily the applied field.
- A stationary coil can still have induced emf if the magnetic field changes.
- More turns increases emf magnitude; it does not reverse the Lenz direction.
- Tilting the coil changes flux through `cos(theta)`, not through the full field
  magnitude alone.

## Transfer

In a pickup sensor or generator coil, first compute the flux change through one
turn, multiply by the number of turns, then use the load resistance to estimate
current. Direction always comes from whether the chosen flux is increasing or
decreasing.
