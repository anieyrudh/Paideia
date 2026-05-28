# @paideia/stochastic-processes Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: Markov-chain
input/result types and pure kernel functions for transition validation,
one-step propagation, and n-step propagation.

## Numerical model

```text
p_next[j] = sum_i p_current[i] P[i][j]
```

Transition matrices are row-stochastic. The kernel rejects invalid matrices
rather than silently normalising them.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Matrix is non-empty and square | `validateTransitionMatrix` returns `precondition-violated` |
| Matrix entries and distribution entries are probabilities | `finiteProbability` returns `precondition-violated` |
| Rows and distributions sum to one | `sumsToOne` returns `out-of-domain` |
| Results are immutable | `Object.freeze` |

## Tests

The Vitest suite covers formula examples, invalid input paths, immutable
results, n-step propagation, and a property test that total probability is
preserved for generated two-state chains.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add absorbing-chain summaries after a consuming container defines state
  labeling conventions.
- Add stationary-distribution iteration only after convergence tolerance and
  iteration limits are specified.
- Add continuous-time chains in a separate contract.

## Anieyrudh Filter pass

- P0 issues checked: no randomness, no sampling, no fitted model, no
  branch-specific presets, no hidden mutable global state, no public `any`.
- P1 issues checked: public API is deliberately narrow, all expected failures
  return `KernelResult.err`, invalid matrices are rejected rather than
  normalised, and result distributions are immutable.
- High-bandwidth questions surfaced: Monte Carlo paths, fitted transition
  models, stationary solvers, absorbing-chain summaries, and continuous-time
  processes are intentionally deferred until consuming containers define the
  contract.
- Outcome: the kernel provides canonical finite Markov propagation numbers for
  stochastic-process visuals.
