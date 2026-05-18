# @paideia/control-systems Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: transfer-function types, PID and response sample types, `controlTolerance`, and the pure kernel functions for transfer-function construction, algebra, unity feedback, PID construction, step response, frequency response, and point evaluation.

## Numerical model

Transfer functions use continuous-time polynomials in descending powers of `s`. `transferFunction` trims leading zero coefficients and normalizes by the denominator leading coefficient so downstream arithmetic has a stable representation.

`stepResponse` converts a proper transfer function into controllable canonical state form and integrates a constant input with fourth-order Runge-Kutta. Improper systems are rejected because their time-domain response contains derivatives of the input that this sampler does not model.

`bode` evaluates `G(jw)` directly with complex Horner evaluation, then derives magnitude, dB magnitude, phase radians, and phase degrees.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Coefficients are finite and non-empty | `validateCoefficients` returns `precondition-violated` |
| Denominator is not zero | `transferFunction` returns `precondition-violated` |
| Denominator is normalized | `transferFunction` divides all coefficients by the denominator leading coefficient |
| Inputs are not mutated | All exported functions copy arrays before returning |
| Singular point evaluation is explicit | `evaluateTransferFunction` returns `undefined-at-point` |
| Step response only accepts proper systems | `validateProper` returns `precondition-violated` |
| Time response cannot allocate unbounded samples | `stepResponse` caps sample count |
| Non-finite integration state is rejected | RK4 helpers return `numerical-instability` |
| Bode frequencies are positive finite rad/s | `bode` returns `precondition-violated` |

## Tests

The Vitest suite covers normalization, input immutability, invalid coefficients, singular evaluation, PID construction, unity feedback, Bode values, step response against the analytic first-order curve, improper step-response rejection, and property-style algebra checks for addition and multiplication across several systems and frequencies.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new allowlist entry and `docs/dependency-clean-room.md` was not needed.

## Anieyrudh Filter pass

- P0 issues checked: no renderer, no branch-specific behavior, no hidden mutable global state, no public `any`, no silent `NaN`/`Infinity` path for expected failures.
- High-bandwidth questions surfaced: future root-locus, pole-zero simplification, and automatic PID tuning should be separate contract additions rather than hidden expansions of this package.
- Outcome: the kernel provides deterministic numbers that simulations can cite; any Bode plot or step trace claiming different values should be rejected by review.
