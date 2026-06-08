# @paideia/queueing-systems technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded
queueing units, Little's Law helpers, utilisation, M/M/1, M/M/c, and M/G/1
metrics.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Rates, durations, customer counts are finite | Unit constructors and result guards. |
| M/G/1 variance is squared-duration typed | `DurationSquared` and `durationSquared`. |
| Server counts are positive safe integers | `serverCount`. |
| Formula divisors are positive | `positiveArrivalRate`, `positiveDuration`, and service-rate guards. |
| Stable queues require `rho < 1` | `stableUtilization`. |
| M/M/c avoids factorial overflow | `mmcMetrics` computes Erlang terms recursively instead of with `a^c / c!`. |
| M/G/1 variance is non-negative | `durationSquared` validates `serviceTimeVariance`. |
| Public results are finite | Checked constructors wrap all calculated outputs. |
| Inputs are not mutated | Functions read from inputs and allocate new output records only. |

## Error Model

- `out-of-domain`: impossible numeric values, such as negative rates,
  non-finite results, or invalid probability-like Erlang values.
- `precondition-violated`: positive-integer server-count failures or unstable
  queues where formulas would diverge.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime queueing package is bundled.

## Numerical Notes

M/M/c uses the standard Erlang C normalisation with `a = lambda / mu` and
`rho = a / c`. Terms are generated recursively (`term_n = term_(n-1) * a / n`)
to avoid avoidable overflow from direct factorial and power operations.

M/G/1 uses the Pollaczek-Khinchine mean-wait formula with caller-supplied
service-time variance and `E[S^2] = Var(S) + E[S]^2`.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden stochastic state. Resolution: the kernel performs no
  simulation and owns no random number generator.
- P0 check: unstable queues returning plausible numbers. Resolution: M/M/1,
  M/M/c, and M/G/1 all reject `rho >= 1`.
- P0 check: non-finite outputs. Resolution: calculated metrics are routed
  through finite result guards.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: unit ambiguity. Resolution: README and AGENTS state that callers
  must keep one consistent time unit per input object.
- P1 check: hidden branch defaults. Resolution: the package has no curriculum
  imports, flags, or presets.
- P1 audit: M/M/c overflow and arbitrary server cap. Resolution: removed the
  cap and switched Erlang C to recurrence arithmetic.
- P1 audit: M/G/1 variance was a bare number. Resolution: added
  `DurationSquared` and `durationSquared`.

High-bandwidth questions surfaced:

- Should a future `core/discrete-event-sim` own stochastic arrival traces and
  priority queues? Deferred; this kernel intentionally covers deterministic
  reference formulas only.

P2 cleanup:

- Audit P2 README cap note: resolved by removing the cap.
- Audit P2 high-server test coverage: resolved with a regression at `c = 170`.
- No deferred P2 items remain for this kernel.
