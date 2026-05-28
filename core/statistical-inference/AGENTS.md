# core/statistical-inference · agent contract

## What this module is
The deterministic statistical-inference kernel for Paideia simulations. It owns
introductory estimator uncertainty helpers: known-sigma mean confidence
intervals, Wald proportion confidence intervals, and standardized effect
diagnostics. It is pure TypeScript and returns `KernelResult` values for
expected invalid inputs.

## Public interface
Exports from `@paideia/statistical-inference`:

- `statisticalInferenceTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type ConfidenceLevel`
- `type MeanConfidenceIntervalInput`
- `type ConfidenceInterval`
- `type ProportionConfidenceIntervalInput`
- `type StandardizedEffectInput`
- `type StandardizedEffectResult`
- `meanConfidenceIntervalKnownSigma(input: MeanConfidenceIntervalInput): KernelResult<ConfidenceInterval>`
- `proportionWaldConfidenceInterval(input: ProportionConfidenceIntervalInput): KernelResult<ConfidenceInterval>`
- `standardizedEffect(input: StandardizedEffectInput): KernelResult<StandardizedEffectResult>`

## Invariants the caller must preserve
- Confidence levels are exactly `0.9`, `0.95`, or `0.99`.
- Population standard deviation, sample size, trial count, and standard error
  are finite and positive where used as denominators.
- Proportion successes and trials are finite integer counts with
  `0 <= successes <= trials`.
- These helpers return interval/effect diagnostics only; wording and decisions
  belong in consuming content or a separate hypothesis-test primitive.

## What this module does NOT do
- Does **not** fit distributions, estimate parameters from raw data, compute
  exact p-values, or choose hypothesis-test wording.
- Does **not** run random sampling, bootstrap simulation, Bayesian inference,
  regression, ANOVA, or causal inference.
- Does **not** hide branch-specific examples, alpha defaults, or curriculum
  wording.

## When to consider this module
Use `core/statistical-inference` when a sim is about to inline confidence
interval margins, estimator standard errors, or standardized effect diagnostics.
Use `core/probability-stats` for existing descriptive probability helpers and
the older normal-mean hypothesis-test decision helper.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current inference sim that
   would consume the new primitive.
2. Add property tests for every interval-width, bounds, or monotonicity
   invariant.
3. Use `core!:` for public API changes that alter critical constants,
   supported confidence levels, or interval formulas.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Adding broad statistical packages for a closed-form teaching helper.
- Presenting Wald intervals as universally appropriate without the caller's
  teaching caveats.
- Adding branch-specific wording or defaults.

## How the Anieyrudh Filter reads this module
The Filter checks that inference visuals distinguish estimator uncertainty from
decision wording. Confidence-interval bars, margin readouts, and standardized
effect labels that disagree with these functions are rejected.
