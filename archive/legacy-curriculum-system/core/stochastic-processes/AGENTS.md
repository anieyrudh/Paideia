# core/stochastic-processes · agent contract

## What this module is
The deterministic stochastic-processes kernel for Paideia simulations. It owns
finite Markov-chain teaching calculations: transition-matrix validation, one-step
distribution propagation, and n-step deterministic propagation. It is pure
TypeScript and returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/stochastic-processes`:

- `stochasticTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type MarkovChainInput`
- `type DistributionStepInput`
- `type NStepDistributionInput`
- `type DistributionResult`
- `validateTransitionMatrix(input: MarkovChainInput): KernelResult<void>`
- `nextDistribution(input: DistributionStepInput): KernelResult<DistributionResult>`
- `nStepDistribution(input: NStepDistributionInput): KernelResult<DistributionResult>`

## Invariants the caller must preserve
- Transition matrices are finite, square, row-stochastic matrices.
- Distributions are finite probability vectors that sum to one.
- Step count is a finite non-negative integer.
- The kernel propagates probabilities deterministically; it never samples.

## What this module does NOT do
- Does **not** run random simulations, Monte Carlo sampling, or hidden RNG.
- Does **not** infer transition matrices, fit processes from data, or model
  continuous-time chains.
- Does **not** hide branch-specific Markov examples or queueing presets.

## When to consider this module
Use `core/stochastic-processes` when a sim is about to inline finite Markov
chain matrix-vector propagation or row-stochastic checks. If a sim needs random
sample paths, fitted models, or continuous-time processes, define a separate
future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current stochastic or
   Markov-chain sim that would consume the new primitive.
2. Add property tests for every new probability-preservation invariant.
3. Use `core!:` for public API changes that alter matrix orientation,
   tolerance, or propagation semantics.

## Anti-patterns
- Adding hidden randomness or sampled paths.
- Returning mutable distributions.
- Accepting matrices that do not sum to one by silently normalising them.
- Adding branch-specific stochastic presets.

## How the Anieyrudh Filter reads this module
The Filter checks that Markov-chain visuals preserve total probability and make
the same transition claims as this kernel. Distribution bars or steady-state
walkthroughs that diverge from these functions are rejected.
