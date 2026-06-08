# core/oncogenetics · agent contract

## What this module is

The deterministic oncogenetics primitives kernel: driver / passenger mutation
bookkeeping, the (1 + s)^k clonal relative-fitness rule, a simple multi-hit
probability approximation, and the closed-form clonal growth-after-N-generations
formula. Owns the small recurring formulas behind clonal-evolution and
multi-hit-risk containers.

This kernel stays at **closed-form deterministic primitives**. It does not
implement stochastic Moran or Wright-Fisher dynamics, full Knudson modelling
with age-specific incidence integration, somatic-mutation pipelines, or any
clinical treatment-recommendation logic (treatment lives in
`core/treatment-response`).

## Public interface

Exports from `@paideia/oncogenetics`:

- `type MutationCount` — branded non-negative integer.
- `type FitnessAdvantage` — branded non-negative finite number.
- `type MutationRatePerCellDivision` — branded number in `[0, 1]`.
- `type CellPopulationSize` — branded non-negative finite number.
- `type RelativeFitness` — branded number `>= 1` (a clone with `k` drivers and per-driver `s ≥ 0` has fitness `(1 + s)^k ≥ 1`).
- `type HitProbability` — branded number in `[0, 1]`.
- `interface CloneState` — `{ drivers: MutationCount; passengers: MutationCount; size: CellPopulationSize }`.
- `interface MultiHitInput` — `{ populationSize: CellPopulationSize; mutationRate: MutationRatePerCellDivision; requiredDriverHits: MutationCount; generations: number }`.
- `interface ClonalGrowthInput` — `{ clone: CloneState; perDriverAdvantage: FitnessAdvantage; generations: number }`.
- `mutationCount(value: number): KernelResult<MutationCount>`
- `fitnessAdvantage(value: number): KernelResult<FitnessAdvantage>`
- `mutationRate(value: number): KernelResult<MutationRatePerCellDivision>`
- `cellPopulationSize(value: number): KernelResult<CellPopulationSize>`
- `relativeFitness(drivers: MutationCount, perDriver: FitnessAdvantage): KernelResult<RelativeFitness>` — `(1 + s)^k`.
- `multiHitProbability(input: MultiHitInput): KernelResult<HitProbability>` — approximation: per-cell per-generation chance of acquiring all `k` driver hits is `mu^k`; over `N` cells and `g` generations the probability of at least one fully-mutated cell is `1 − (1 − mu^k)^(N · g)`.
- `clonalGrowthAfterGenerations(input: ClonalGrowthInput): KernelResult<CellPopulationSize>` — `size · ((1 + s)^drivers)^generations`.
- `compareClonalGrowth(a: ClonalGrowthInput, b: ClonalGrowthInput): KernelResult<{ aSize: CellPopulationSize; bSize: CellPopulationSize; ratio: number }>` — runs both and returns the ratio `aSize / bSize`. Rejects zero `bSize`.

## Invariants the caller must preserve

- `MutationCount` is a non-negative integer.
- `FitnessAdvantage` is a non-negative finite number (`0` ⇒ neutral driver,
  no advantage).
- `MutationRatePerCellDivision` is in `[0, 1]`.
- `CellPopulationSize` is a non-negative finite real (we model the
  deterministic-growth limit, so non-integer sizes are allowed).
- `RelativeFitness ≥ 1` because `(1 + s)^k ≥ 1` for `s ≥ 0` and `k ≥ 0`.
- `multiHitProbability` requires at least one driver hit and at least one
  generation; both zero would short-circuit to a useless answer and the
  kernel returns `precondition-violated`.

## What this module does NOT do

- Does **not** sample any random variable. The probability returned is the
  approximate analytic chance; no stochastic simulation.
- Does **not** integrate age-specific incidence curves. Use
  `core/dynamical-systems` if a sim needs that.
- Does **not** model spatial tumour growth, hypoxia, or angiogenesis.
- Does **not** recommend treatment. Treatment helpers live in
  `core/treatment-response`.
- Does **not** parse Cancer Cell Line Encyclopedia, COSMIC, or any clinical
  dataset.
- Does **not** render anything.

## When to consider this module

Use `core/oncogenetics` when a sim needs the `(1 + s)^k` relative-fitness
rule, a multi-hit probability approximation, or closed-form clonal growth
after a few hundred generations. If a container is about to inline
`Math.pow(1 + s, k)`, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the multi-hit approximation,
   - changes the brand identity of any exported type,
   - relaxes the `RelativeFitness ≥ 1` invariant.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Embedding stochastic noise inside any deterministic helper.
- Adding patient-specific or clinical-recommendation logic.
- Hard-coding tumour-suppressor or oncogene names.
