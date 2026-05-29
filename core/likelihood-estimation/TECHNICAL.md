# @paideia/likelihood-estimation Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: likelihood curve
types, one generic MLE result type, and pure kernel functions for Bernoulli,
Poisson, and normal-mean-known-sigma likelihoods.

## Numerical model

```text
Bernoulli: log L(p) = s log(p) + (n - s) log(1 - p)
Poisson:   log L(lambda) = sum(x_i log(lambda) - lambda - log(x_i!))
Normal:    log L(mu) = sum(-log(sigma sqrt(2pi)) - (x_i - mu)^2 / (2 sigma^2))
```

MLE estimates:

```text
p_hat = successes / trials
lambda_hat = mean(x_i)
mu_hat = mean(x_i)
```

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Counts are finite non-negative integers | `nonNegativeInteger` guards return `precondition-violated` |
| Bernoulli successes do not exceed trials | Public helpers return `out-of-domain` |
| Probabilities are in `[0, 1]` | `probability` guard returns `out-of-domain` |
| Poisson rates and normal sigma are positive | `positive` guard returns `precondition-violated` |
| Observations are finite and non-empty | `observations` guards return `precondition-violated` |
| Poisson observations are integer counts | `poissonObservations` guards return `precondition-violated` |
| Candidate grids are non-empty, finite, and unique when supplied | `validateCandidates` guards return `precondition-violated` |
| Derived finite likelihood values reject instability | `finiteDerived` / `finiteLogLikelihood` guards return `numerical-instability` |
| Results are immutable | Public result objects and arrays are frozen |

## Tests

The Vitest suite covers formula examples, boundary Bernoulli likelihoods,
invalid input paths for every model family, immutable result shape, and property
tests proving the closed-form MLE locations.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add binomial coefficient helpers only if a container needs likelihoods rather
  than log-likelihoods up to proportionality.
- Add exponential-rate or normal-variance MLEs after a consuming container
  defines the parameter domain and formula panel needs.
- Consider sharing candidate-grid utilities if more estimation kernels need
  identical validation.

## Anieyrudh Filter pass

- P0 issues checked: no arbitrary distribution fitting, no hidden optimiser, no
  randomness, no branch-specific presets, no rendering dependency, no public
  `any`, and no `NaN`/`Infinity` public outputs except intentional
  `-Infinity` for impossible Bernoulli boundary likelihoods.
- P1 issues checked: every expected invalid input returns `KernelResult.err`,
  formulas are documented, result arrays are immutable, and candidate-grid
  semantics are caller-owned.
- High-bandwidth questions surfaced: normal-variance MLE, exponential-rate MLE,
  and EM/GMM estimation are intentionally deferred until containers need those
  exact teaching models.
- Outcome: the kernel unblocks the MLE container with canonical one-parameter
  likelihood values and chart-ready curve data.
