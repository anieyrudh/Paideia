---
subject: smt
concept: fourier-mode-superposition
branch: sutd
level: Undergraduate
syllabus_ref: SUTD SMT / mathematical modelling / Fourier series and modal approximation
prerequisites:
  - linear-system-stability
  - oscillations
  - eigenvectors
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Fourier Mode Superposition

## First-Principles Explanation

A Fourier sine series treats a shape on a fixed interval as a sum of simple
standing-wave modes. On a string of length \(L\), the basis functions are

```latex
\phi_n(x)=\sin\left(\frac{n\pi x}{L}\right),\qquad n=1,2,3,\ldots
```

Each coefficient says how much of that mode is present:

```latex
c_n=\frac{2}{L}\int_0^L f(x)\sin\left(\frac{n\pi x}{L}\right)\,dx
```

The important idea is not that a complicated shape secretly "is" one sine
wave. The idea is that the basis modes are independent enough that each
projection coefficient can be measured separately. Adding more modes usually
reduces the residual error because the reconstruction has more independent
directions to use.

## Why It Matters

SUTD modelling problems often turn a continuous state into mode amplitudes:
string vibration, heat flow in a rod, signal filtering, structural modes, and
linearised PDE models. Once the state is expressed as coefficients, the model
can update each mode using a simpler rule.

## Canonical Example

For a one metre string with a centre pluck, the first sine arch carries most of
the energy because the target is broadly positive over the whole interval. A
two-lobed target instead has a larger second coefficient because it changes
sign once across the interval.

## Common Misconceptions

- A single mode does not need to explain the whole shape. The leftover residual
  is exactly the signal that another mode is needed.
- Coefficients are not arbitrary sliders. They are signed projection lengths
  computed by multiplying the target shape by a basis mode and integrating.
- More modes do not always mean visible improvement at the same rate. A smooth
  target concentrates energy in low modes; a sharp target spreads energy across
  higher modes.
