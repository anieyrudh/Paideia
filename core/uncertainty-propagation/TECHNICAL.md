# @paideia/uncertainty-propagation technical notes

## Implementation

The kernel is dependency-free apart from `@paideia/shared`. It accepts finite
numbers, returns `KernelResult`, and emits readonly calculation records for
simulation notebooks.

Implemented methods:

- Measurement construction with same-unit branded values where callers provide
  brands such as `Metres` or `Seconds`.
- Absolute, relative, and percentage uncertainty conversion.
- Add/subtract propagation by summed absolute uncertainties.
- Multiply/divide propagation by summed relative uncertainties.
- Simple power propagation by `|exponent| × relative uncertainty`.
- Repeated-reading half-range and instrument-resolution helpers.
- Source selection that chooses the larger available absolute uncertainty.
- Basic display formatting for measured values.

## Public interface summary

The public API is the exact export list declared in `AGENTS.md`. The kernel
does not export React components, renderers, hidden mutable state, or compound
unit brands.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Finite input values | Runtime guards return `precondition-violated` |
| Same-unit add/subtract terms | Caller invariant documented in `AGENTS.md`; TypeScript brands help at the boundary |
| Non-negative absolute uncertainty | Runtime guards return `out-of-domain` |
| Positive instrument resolution | Runtime guard returns `out-of-domain` |
| Relative uncertainty requires non-zero value | Runtime guard returns `out-of-domain` |
| Denominators cannot be zero | Runtime guard returns `out-of-domain` |
| Derived outputs remain finite | Runtime guards return `numerical-instability` |
| Caller arrays are not mutated | Tests preserve input JSON/order |
| Multiplicative order invariant | Generated-seed tests compare factor order |
| Add/subtract uncertainty sum invariant | Generated-seed tests compare summed inputs |

## Dependency and license notes

No runtime dependency was added beyond `@paideia/shared`, which is an internal
workspace package. No GPL, AGPL, LGPL, SSPL, BUSL, or Commons-Clause dependency
is bundled.

## Anieyrudh Filter pass

Diagnosis: measurement sims are fragile when the displayed notebook prose and
the underlying calculation drift apart. This kernel makes the numerical result
and the explanatory steps one return value.

Falsifying scenario: a sim displays quotient uncertainty as a sum of percentage
uncertainties while computing an absolute sum, or chooses instrument resolution
when repeated-reading spread is larger. Either case must fail against this
kernel's returned `steps` and selected `UncertaintySource`.

Boundary decision: the kernel owns first-order classroom uncertainty rules only.
It does not infer compound units, model correlations, perform statistical
confidence intervals, render UI, or weaken prediction-gate timing.
