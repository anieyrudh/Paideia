---
subject: 10-017-technological-world-e-and-m
concept: maxwell-equations-and-em-waves
branch: sutd
level: Undergraduate
syllabus_ref: SUTD 10.017 / Maxwell equations and electromagnetic waves
prerequisites:
  - electric-fields
  - magnetic-fields
  - faraday-law
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Maxwell Equations and EM Waves

Maxwell's equations say that electric and magnetic fields are not separate bookkeeping devices. A changing magnetic field creates a circulating electric field, and Maxwell's displacement-current term says a changing electric field creates magnetic circulation even when no conduction current is present.

That symmetry allows a self-propagating electromagnetic wave. The electric field, magnetic field, and direction of travel are mutually perpendicular. In a simple non-dispersive medium,

```text
v = c / sqrt(epsilon_r mu_r)
lambda = v / f
B0 = E0 / v
```

The wave speed is not chosen independently. It follows from the medium's permittivity and permeability. Larger relative permittivity or permeability increases the refractive index and slows the wave, so the wavelength becomes shorter at the same frequency.

## Canonical Example

A 600 THz wave in vacuum travels at 2.998 x 10^8 m/s. Its wavelength is

```text
lambda = (2.998 x 10^8 m/s) / (6.00 x 10^14 Hz)
       = 5.00 x 10^-7 m
```

That is visible light. If its electric-field amplitude is 12 V/m, then

```text
B0 = E0 / c = 4.00 x 10^-8 T
```

## Common Misconceptions

- EM waves require a wire current everywhere. The displacement-current term is what makes vacuum propagation possible.
- The electric and magnetic parts are independent waves. They are coupled components of one transverse wave.
- A larger permittivity makes light faster. It usually makes the wave slower because the refractive index is larger.

## Transfer

Optics problems use the same model. If frequency stays fixed while wavelength shortens in glass, then the wave speed has decreased and the refractive index is greater than one.
