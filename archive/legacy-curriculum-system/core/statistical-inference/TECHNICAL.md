# @paideia/statistical-inference Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: confidence level
types, input/result types, and pure kernel functions for known-sigma mean
confidence intervals, Wald proportion confidence intervals, and standardized
effect diagnostics.

## Numerical model

```text
known-sigma mean SE = sigma / sqrt(n)
mean interval = sampleMean +/- z* SE
proportion estimate = successes / trials
proportion SE = sqrt(p_hat (1 - p_hat) / n)
standardized effect = (estimate - nullValue) / SE
```

Supported confidence levels use fixed standard-normal critical values for 90%,
95%, and 99% intervals.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Supported confidence levels only | `confidenceCritical` returns `out-of-domain` |
| Positive denominators and standard errors | `positive` / `positiveInteger` return `precondition-violated` |
| Proportion counts are integers and successes do not exceed trials | `nonNegativeInteger` and explicit `out-of-domain` guard |
| Compound results are immutable | `Object.freeze` |
| Non-finite derived values are rejected | `finiteDerived` returns `numerical-instability` |

## Tests

The Vitest suite covers formula examples, invalid input paths, error codes,
immutable interval results, standardized-effect directions, and a property test
that known-sigma interval width shrinks as sample size increases.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add t-interval helpers only after a consuming container defines degrees of
  freedom and critical-value source.
- Add two-sample interval helpers after a container fixes pooled versus Welch
  assumptions.
- Add hypothesis-test wording separately from this estimator-uncertainty kernel.

## Anieyrudh Filter pass

- P0 issues checked: no random sampling, no broad statistics dependency, no
  raw-data fitting, no branch-specific defaults, no hidden mutable global state,
  no public `any`.
- P1 issues checked: public API is deliberately narrow, all expected failures
  return `KernelResult.err`, supported critical constants are explicit, and
  compound results are immutable.
- High-bandwidth questions surfaced: exact p-values, bootstrap, Bayesian
  inference, regression, ANOVA, causal inference, and hypothesis-test wording
  are intentionally deferred until consuming containers define the contract.
- Outcome: the kernel provides canonical interval/effect numbers for inference
  visuals; any visual that adds decision wording beyond these functions should
  fail review unless another reviewed primitive owns that wording.
