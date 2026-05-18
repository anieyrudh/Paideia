# Technical Notes

## Public Interface Summary

`@paideia/dimensional-analysis` exposes immutable dimension and unit value
objects, SI base dimensions, arithmetic helpers, equality/compatibility checks,
formatters, and `diagnoseEquation` for invalid-equation feedback.

The public API is intentionally small:

- `Dimension` is a seven-entry exponent vector over SI base dimensions.
- `Unit` pairs a readable symbol with a dimension and positive finite scale.
- Dimension arithmetic returns new values and never mutates caller objects.
- Incompatible equations return an `EquationDiagnostic` rather than an error;
  malformed dimensions, units, exponents, or scales return `KernelResult.err`.

## Invariant Enforcement

| Invariant | Enforcement |
| --- | --- |
| Exponents are finite real numbers | `dimension`, arithmetic helpers, formatting, and diagnostics rebuild/validate exponent vectors |
| Unit symbols are non-empty | `unit`, `formatUnit`, and unit arithmetic trim and validate symbols |
| Unit scale is positive and finite | `unit`, `multiplyUnits`, `divideUnits`, and `powerUnit` check scale values |
| Arithmetic never returns non-finite exponents | Dimension operations return `numerical-instability` if an exponent overflows |
| Compatibility is tolerance-based | `diagnoseEquation`, `dimensionsEqual`, and `compatibleDimensions` compare against `dimensionalAnalysisTolerance.default` |
| Formatting is deterministic | `formatDimension` walks the canonical SI base-dimension order |
| Caller inputs are not mutated | Operations construct fresh exponent maps and tests snapshot caller objects |

## Dependency and License Notes

No runtime dependency was added. The package depends only on workspace
`@paideia/shared` for `KernelResult`, `ok`, and `err`. This keeps the kernel
clear of GPL, AGPL, LGPL, SSPL, BUSL, and Commons-Clause runtime dependencies.

## Generator Notes

No generated files were touched. The package was created manually following
`.agents/skills/new-kernel/SKILL.md` and nearby core kernel package structure.

## Testing Notes

Tests cover:

- base and derived dimensions
- dimensionless and fractional powers
- unit construction and readable unit formatting
- valid and invalid equation diagnostics
- every current `KernelResult.err` precondition family
- sampled algebraic properties: commutative multiplication, self-division to
  dimensionless, and exponent distribution over multiplication

## Anieyrudh Filter pass

Date: 2026-05-18

### P0 blockers

- **Kernel boundary:** Pass. The implementation is pure TypeScript with no
  React, DOM, parser, renderer, or branch-specific imports.
- **Error handling:** Pass. Invalid preconditions return `KernelResult.err`;
  incompatible but well-formed equations return diagnostics for learner-facing
  feedback.
- **Conceptual honesty:** Pass. Documentation states that dimensional
  compatibility is necessary but not sufficient for physical correctness.
- **Shared convention:** Pass. Formatting and diagnostics use one canonical SI
  base-dimension order so sims do not invent incompatible unit fingerprints.
- **License:** Pass. No new external runtime dependency was added.

### P1 issues addressed or deferred

- **Unit registry:** Deferred intentionally. This kernel records caller-supplied
  unit symbols and scales, but avoids a hidden registry until containers need
  conversion semantics.
- **Equation parsing:** Deferred intentionally. Free-form parsing belongs in a
  future parser or in `core/function-eval`; this package owns the dimension
  arithmetic and compatibility result.

### Verdict

Approved for core-kernel review with zero open P0 issues and no P1 issue that
blocks this PR.
