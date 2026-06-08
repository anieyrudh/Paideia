# @paideia/complexity-theory Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: finite word and
decision types, evidence input/result types, and pure kernel functions for
finite language membership, finite verifier pairs, and finite many-one
reduction evidence.

## Numerical model

There is no numeric solver in this kernel. The model is finite set and table
evidence:

```text
membership(w, A) = accept iff w is in explicit finite set A
verifier(x, c, P) = accept iff (x, c) is in explicit accepting-pair table P
reduction evidence passes iff every sample has sourceDecision == targetDecision
```

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Words are non-empty finite strings | `finiteWord` and internal guards return `precondition-violated` |
| Decisions are only `accept` or `reject` | `validDecision` returns `precondition-violated` |
| Reduction name is not blank | `checkFiniteManyOneReductionEvidence` returns `precondition-violated` |
| Reduction samples are non-empty | `checkFiniteManyOneReductionEvidence` returns `precondition-violated` |
| Compound results and counterexample arrays are immutable | `Object.freeze` |

## Tests

The Vitest suite covers every public function with accepting/rejecting examples,
invalid input paths, error codes, immutable results, counterexample reporting,
and a property test that finite membership agrees with JavaScript `Set`
membership over generated samples.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add finite complexity-class comparison cards only after a consuming container
  defines the exact labels and prerequisite graph.
- Add bounded verifier runtime accounting after a container defines the
  machine-step model.
- Add recurrence-tree evidence in a separate algorithms kernel rather than
  widening this finite-language contract.

## Anieyrudh Filter pass

- P0 issues checked: no theorem prover, no SAT/SMT dependency, no parser, no
  hidden solver, no branch-specific presets, no hidden mutable global state, no
  public `any`.
- P1 issues checked: public API is deliberately narrow, all expected failures
  return `KernelResult.err`, finite evidence is not presented as proof, and
  compound results are immutable.
- High-bandwidth questions surfaced: theorem proving, infinite language
  decision, SAT solving, Turing-machine parsing, and asymptotic proof search are
  intentionally deferred until a future contract requires them.
- Outcome: the kernel provides canonical finite evidence for complexity
  visuals; any visual that promotes finite evidence into a formal proof should
  fail review.
