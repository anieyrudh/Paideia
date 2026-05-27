# @paideia/finance technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded money,
rates, periods, DCF helpers, IRR, payback, common ratio helpers, and snapshot
analysis.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Money values are finite | `money` and calculated-output guards. |
| Non-negative money values are finite and `>= 0` | `nonNegativeMoney`. |
| Discount rates are finite and greater than `-1` | `discountRate`. |
| Periods are non-negative safe integers | `period`. |
| Cash-flow periods are strictly increasing | `validateCashFlows`. |
| IRR has both inflow and outflow signs | `internalRateOfReturn` sign guard. |
| IRR avoids ambiguous multiple-root teaching cases | Cash-flow sign-change guard rejects more than one sign change. |
| IRR bracket must straddle a root | Bisection precondition guard. |
| Ratio denominators are positive | `positiveMoney` and `positiveSignedMoney`. |
| Public results are finite | `checkedMoney`, `checkedRatio`, and discount-factor guards. |
| Inputs are not mutated | Functions copy arrays and allocate output records only. |

## Error Model

- `out-of-domain`: non-finite numbers, negative non-negative money values, or
  discount rates `<= -1`.
- `precondition-violated`: invalid periods, empty or unsorted cash flows, zero
  ratio denominators, invalid IRR brackets, or impossible quick-ratio inputs.
- `numerical-instability`: non-finite discount factors, present values, ratios,
  or IRR iteration values.
- `convergence-failed`: IRR bracket does not straddle a root or bisection does
  not converge within `maxIterations`.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime finance package is bundled.

## Numerical Notes

NPV is the sum of each cash flow divided by `(1 + r)^period`. IRR is solved by
bisection over the requested bracket; this is deterministic and sufficient for
teaching single-root cases. Payback is undiscounted and linearly interpolates
within the period where cumulative cash flow first becomes non-negative.

Ratios are returned as decimals: `0.1` means 10%. Learner-facing UIs can format
them as percentages or multiples depending on the concept.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: non-finite financial outputs. Resolution: all calculated money,
  ratio, discount factor, and IRR values pass finite guards.
- P0 check: zero denominators shown as zero ratios. Resolution: ratio helpers
  reject zero denominators with `precondition-violated`.
- P0 check: hidden external data or global state. Resolution: the kernel is pure
  and performs no fetches, time reads, random sampling, or caching.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: IRR presented without a root bracket. Resolution:
  `internalRateOfReturn` requires a bracket that straddles the root and reports
  `convergence-failed` otherwise.
- P1 check: multiple IRR candidates hidden behind one value. Resolution: cash
  flows with more than one sign change are rejected.
- P1 check: cash-flow order ambiguity. Resolution: `validateCashFlows` requires
  strictly increasing periods.
- P1 check: payback confused with NPV. Resolution: README and AGENTS state that
  payback is undiscounted and should not be presented as an NPV substitute.

High-bandwidth questions surfaced:

- Should terminal value, WACC decomposition, or probabilistic sensitivity belong
  here? Deferred; this kernel intentionally covers deterministic teaching
  primitives only.

P2 cleanup:

- Add `core/finance` to `docs/core-modules.md` during the broader core catalogue
  refresh.
