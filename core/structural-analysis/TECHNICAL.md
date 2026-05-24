# @paideia/structural-analysis Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: structural unit
brands, input/result types, and pure kernel functions for stress, strain,
elastic modulus, axial deformation, section properties, bending, torsion,
buckling, plane-stress combination, von Mises stress, and safety factor.

## Numerical model

The kernel uses introductory mechanics-of-materials formulae:

```text
sigma = F / A
epsilon = delta / L
E = sigma / epsilon
delta = F L / (A E)
I_rect = b h^3 / 12
S_rect = I / (h / 2)
I_circle = pi d^4 / 64
J_circle = pi d^4 / 32
sigma_b = M y / I
tau_t = T r / J
P_cr = pi^2 E I / L_effective^2
sigma_1,2 = avg ± sqrt(((sigma_x - sigma_y) / 2)^2 + tau_xy^2)
sigma_vm = sqrt(sigma_x^2 - sigma_x sigma_y + sigma_y^2 + 3 tau_xy^2)
FS = allowable / |actual|
```

Public values are SI: newtons, newton-metres, pascals, metres, square metres,
cubic metres, metres to the fourth power, and dimensionless strain/factors.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Positive physical coefficients and denominators | `positive` guards return `precondition-violated` |
| Signed loads and stresses remain finite | `finite` guards |
| Section-property and stress results remain finite | `finiteDerived` returns `numerical-instability` |
| Safety factor uses stress magnitude and rejects zero actual stress | `safetyFactor` guards `abs(actualStressPascals)` as positive |
| Returned section and principal-stress result objects are immutable | `Object.freeze` |
| Euler buckling domain is ideal column only | Contract and README scope; input length is already effective length `K L`; no empirical code factors bundled |

## Tests

The Vitest suite covers every public function with formula examples, invalid
input paths, immutable result objects, all package error codes, and property
tests for axial-stress force linearity, section-property monotonicity, and
principal-stress shear symmetry.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add indeterminate-beam helpers only after a concrete container defines the
  supported boundary-condition set.
- Add material-property selection helpers only after the repo has a
  license-clean, cited material dataset.
- Add fatigue, creep, and fracture helpers only after the first consuming
  container defines the assumptions and visual evidence.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden
  mutable global state, no public `any`, no silent `NaN`/`Infinity` path for
  expected failures, no runtime dependency beyond `@paideia/shared`.
- P1 issues checked: public API is deliberately narrow, all public physical
  quantities are SI-branded, expected invalid inputs return `KernelResult.err`,
  and result objects used by visuals are immutable.
- High-bandwidth questions surfaced: FEA, indeterminate structures, plasticity,
  crack growth, fatigue, creep, design-code factors, and material databases are
  intentionally deferred until their first consuming containers define the
  required contract.
- Outcome: the kernel provides canonical numbers for structural visuals; any
  stress, strain, buckling, principal-stress, von Mises, or safety-factor
  display that diverges from these functions should fail review.
