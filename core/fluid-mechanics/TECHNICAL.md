# @paideia/fluid-mechanics Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: fluid unit
brands, constants, input/result types, and pure kernel functions for Reynolds
number, hydrostatics, buoyancy, continuity, Bernoulli pressure, Darcy pipe
losses, drag force, Hagen-Poiseuille pipe flow, plane-Couette shear, Stokes
drag, capillary rise, and Peclet number.

## Numerical model

The kernel uses introductory fluid-mechanics formulae:

```text
Re = rho v L / mu
p_gauge = rho g h
F_b = rho g V_displaced
Q = A v
p_2 = p_1 + 1/2 rho (v_1^2 - v_2^2) + rho g (z_1 - z_2)
f_laminar = 64 / Re
f_turbulent = Haaland approximation
h_f = f (L / D) v^2 / (2g)
F_D = 1/2 rho v^2 C_D A
Q_poiseuille = pi r^4 Delta p / (8 mu L)
u_couette(y) = U y / h
tau_couette = mu U / h
F_stokes = 6 pi mu r v
h_capillary = 2 gamma cos(theta) / (rho g r)
Pe = v L / D
```

Public values are SI: kilograms per cubic metre, pascal seconds, pascals,
metres, square metres, cubic metres, cubic metres per second, metres per
second, square metres per second, metres per second squared, newtons, newtons
per metre, and degrees.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Positive physical coefficients and denominators | `positive` guards return `precondition-violated` |
| Depth, elevation, velocity magnitude, roughness, volume, and area where allowed are non-negative | `nonNegative` guards |
| Relative roughness is kept within the Haaland helper scope | `relativeRoughness` returns `out-of-domain` above `0.2` |
| Bernoulli target pressure cannot go below zero | `bernoulliPressureAtTarget` returns `out-of-domain` |
| Couette sample position must stay inside the plate gap | `planeCouetteFlow` returns `out-of-domain` |
| Capillary contact angle is limited to 0 through 180 degrees | `capillaryRiseHeight` returns `out-of-domain` |
| Returned compound results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers every public function with formula examples, invalid
input paths, immutable friction-factor results, all package error codes, and
property tests for Reynolds linearity, hydrostatic-pressure monotonicity,
Poiseuille radius-to-the-fourth scaling, Stokes drag linearity, and Peclet
velocity linearity.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add control-volume momentum helpers after a concrete jet/pipe-bend container
  defines the sign convention and visual contract.
- Add rectangular-channel and parallel-plate microflow helpers after a
  consuming container defines the channel geometry assumptions.
- Add pump/system-curve helpers only after an energy-systems container defines
  required assumptions.
- Add diffusion time-scale helpers when a first transport container defines
  whether characteristic length is radius, diameter, or slab thickness.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency beyond `@paideia/shared`.
- P1 issues checked: public API is deliberately narrow, all public physical
  quantities are SI-branded, all expected failures return `KernelResult.err`,
  turbulent friction uses a documented approximation, closed-form viscous
  helpers declare their laminar/no-slip assumptions, and result objects used by
  visuals are immutable.
- High-bandwidth questions surfaced: CFD, turbulent spectra, compressible
  flow, water hammer, pumps, free surfaces, pipe networks, non-Newtonian flow,
  electro-osmosis, and microfluidic droplet dynamics are intentionally deferred
  until their first consuming containers define the required contract.
- Outcome: the kernel provides canonical numbers for fluid visuals; any
  Reynolds, buoyancy, Bernoulli, head-loss, drag, Poiseuille, Couette,
  capillary, Stokes, or Peclet display that diverges from these functions
  should fail review.
