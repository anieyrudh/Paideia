# core/complexity-theory · agent contract

## What this module is
The deterministic complexity-theory kernel for Paideia simulations. It owns
finite teaching evidence for language membership, certificate verification, and
many-one reduction preservation over explicit samples. It is pure TypeScript
and returns `KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/complexity-theory`:

- `complexityTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type FiniteWord`
- `type LanguageDecision`
- `type FiniteLanguageMembershipInput`
- `type FiniteLanguageMembershipResult`
- `type FiniteVerifierPair`
- `type FiniteVerifierInput`
- `type FiniteVerifierResult`
- `type FiniteReductionSample`
- `type ReductionCounterexample`
- `type FiniteReductionEvidenceInput`
- `type FiniteReductionEvidenceResult`
- `finiteWord(value: string): KernelResult<FiniteWord>`
- `decideFiniteLanguageMembership(input: FiniteLanguageMembershipInput): KernelResult<FiniteLanguageMembershipResult>`
- `verifyFiniteCertificate(input: FiniteVerifierInput): KernelResult<FiniteVerifierResult>`
- `checkFiniteManyOneReductionEvidence(input: FiniteReductionEvidenceInput): KernelResult<FiniteReductionEvidenceResult>`

## Invariants the caller must preserve
- Words are explicit non-empty finite strings created with `finiteWord`.
- Language decisions are exactly `accept` or `reject`.
- Finite verifier evidence is an explicit list of accepting
  `(instance, certificate)` pairs.
- Reduction evidence is finite sample evidence only: every sample must preserve
  membership from source decision to target decision to pass.

## What this module does NOT do
- Does **not** prove language class membership or theorem statements.
- Does **not** infer reductions, run SAT solvers, parse Turing machines, or
  decide infinite languages.
- Does **not** implement asymptotic proof search, proof assistants, or
  randomized algorithms.
- Does **not** hide branch-specific curricula, problem banks, or examples.

## When to consider this module
Use `core/complexity-theory` when a sim needs finite evidence for a membership
table, certificate verifier table, or many-one reduction sample table. If a sim
needs a theorem prover, SAT solver, parser, or symbolic proof system, stop and
define a separate future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current complexity or
   algorithms sim that would consume the new primitive.
2. Add property tests for every new preservation or witness invariant.
3. Use `core!:` for public API changes that alter decision strings,
   counterexample semantics, or evidence interpretation.

## Anti-patterns
- Returning booleans without the original word/evidence context.
- Treating finite reduction evidence as a formal proof over infinite languages.
- Adding parsers, theorem provers, SAT/SMT dependencies, or hidden solvers.
- Mutating caller-provided evidence arrays.
- Adding branch-specific examples as kernel defaults.

## How the Anieyrudh Filter reads this module
The Filter checks that complexity visuals distinguish finite evidence from
formal proof. A membership table, verifier result, or reduction diagram that
claims more than these explicit finite functions establish is rejected.
