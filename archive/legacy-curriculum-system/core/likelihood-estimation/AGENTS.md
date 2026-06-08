# core/likelihood-estimation · agent contract

## What this module is
The deterministic likelihood-estimation kernel for Paideia simulations. It owns
closed-form likelihood and maximum-likelihood helpers for introductory
one-parameter models: Bernoulli probability, Poisson rate, and normal mean with
known standard deviation. It returns pure data for charts and formula panels.

## Public interface
Exports from `@paideia/likelihood-estimation`:

- `likelihoodEstimationTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type LikelihoodCurvePoint`
- `type MleEstimate`
- `type BernoulliLogLikelihoodInput`
- `type BernoulliMleInput`
- `type PoissonLogLikelihoodInput`
- `type PoissonMleInput`
- `type NormalMeanKnownSigmaLogLikelihoodInput`
- `type NormalMeanKnownSigmaMleInput`
- `bernoulliLogLikelihood(input: BernoulliLogLikelihoodInput): KernelResult<number>`
- `bernoulliMaximumLikelihood(input: BernoulliMleInput): KernelResult<MleEstimate<"probability">>`
- `poissonLogLikelihood(input: PoissonLogLikelihoodInput): KernelResult<number>`
- `poissonMaximumLikelihood(input: PoissonMleInput): KernelResult<MleEstimate<"rate">>`
- `normalMeanKnownSigmaLogLikelihood(input: NormalMeanKnownSigmaLogLikelihoodInput): KernelResult<number>`
- `normalMeanKnownSigmaMaximumLikelihood(input: NormalMeanKnownSigmaMleInput): KernelResult<MleEstimate<"mean">>`

## Invariants the caller must preserve
- Bernoulli successes and trials are finite integer counts with
  `0 <= successes <= trials`.
- Candidate probabilities are finite values in `[0, 1]`.
- Poisson observations are finite non-negative integer counts, and candidate
  rates are finite positive values.
- Normal observations and candidate means are finite, and the known standard
  deviation is finite and positive.
- Candidate grids are caller-owned. This kernel evaluates them; it does not
  choose curriculum-specific presets.

## What this module does NOT do
- Does **not** fit arbitrary distributions or infer a model family.
- Does **not** compute confidence intervals, p-values, Bayesian posteriors,
  regression, EM, or neural-network losses.
- Does **not** run random sampling or optimisation loops.
- Does **not** render likelihood curves. Pair with `core/charting` or
  `core/plotting`.
- Does **not** hide branch-specific examples, priors, or source data.

## When to consider this module
Use `core/likelihood-estimation` when a sim is about to inline likelihood
formulas, MLE estimates, or likelihood-curve values for Bernoulli, Poisson, or
normal-mean-known-sigma teaching examples.

## Extension protocol
1. Open a `core-change-proposal` issue naming the consuming containers.
2. Add a new one-parameter family only when its likelihood convention and
   parameter domain are clear.
3. Keep multi-parameter fitting, EM, and numeric optimisers in separate kernels
   or out-of-scope until a concrete container requires them.

## Anti-patterns
- Returning `NaN` or `Infinity` from public helpers.
- Silently clipping invalid parameters.
- Running hidden optimisation, random search, or memoisation.
- Mutating caller-provided observation or candidate arrays.
- Adding a broad statistics dependency for closed-form formulas.

## How the Anieyrudh Filter reads this module
The Filter checks that a displayed likelihood curve and MLE marker are computed
from the same model family and observations as this kernel. A sim that shows a
Bernoulli curve while using a normal formula, hides impossible boundary cases,
or reveals MLE evidence before prediction is rejected.
