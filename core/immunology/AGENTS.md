# core/immunology · agent contract

## What this module is

The deterministic immunology primitives kernel: epitope-string match affinity
between an antigen and an antibody, Hill-form vaccine booster response,
exponential immunity waning, and the SIR-compatible
`effectiveReproductionNumber` calculation. Owns the small recurring formulas
behind vaccine-and-booster, herd-immunity, and antigen-mismatch containers.

This kernel stays at **closed-form deterministic helpers**. It does not
implement a full SIR ODE solver (compose `effectiveReproductionNumber` with
`core/dynamical-systems` for that), and does not implement clonal-selection
combinatorics, MHC binding affinities, or B-cell receptor maturation
trajectories.

## Public interface

Exports from `@paideia/immunology`:

- `type EpitopeSequence` — branded uppercase string over `{A, C, G, T, U}` ∪ amino-acid letters; minimum length 1, maximum length 64.
- `type AffinityScore` — branded number in `[0, 1]`.
- `type ImmunityLevel` — branded number in `[0, 1]`.
- `type DoseAmount` — branded non-negative finite number (dimensionless, normalised by half-max).
- `type DecayRate` — branded non-negative finite number per day.
- `type ReproductionNumber` — branded non-negative finite number.
- `interface BoosterInput` — `{ previousImmunity: ImmunityLevel; doseSize: DoseAmount; halfMaxDose: DoseAmount; hillCoefficient: number }`.
- `interface WaningInput` — `{ immunity: ImmunityLevel; decayRate: DecayRate; days: number }`.
- `interface HerdImmunityInput` — `{ baseR0: ReproductionNumber; immunityFraction: ImmunityLevel }`.
- `epitopeSequence(value: string): KernelResult<EpitopeSequence>`
- `affinityScore(value: number): KernelResult<AffinityScore>`
- `immunityLevel(value: number): KernelResult<ImmunityLevel>`
- `doseAmount(value: number): KernelResult<DoseAmount>`
- `decayRate(value: number): KernelResult<DecayRate>`
- `reproductionNumber(value: number): KernelResult<ReproductionNumber>`
- `matchAffinity(antigen: EpitopeSequence, antibody: EpitopeSequence): KernelResult<AffinityScore>` — equal-length comparison; returns the fraction of matching positions clamped to `[0, 1]`.
- `boosterResponse(input: BoosterInput): KernelResult<ImmunityLevel>` — combines previous immunity with a Hill-form bump: `1 − (1 − I_prev) · K^n / (K^n + d^n)`.
- `waneImmunity(input: WaningInput): KernelResult<ImmunityLevel>` — `I(t) = I · exp(−λ · t)`.
- `effectiveReproductionNumber(input: HerdImmunityInput): KernelResult<ReproductionNumber>` — `R_e = R_0 · (1 − p)`.
- `herdImmunityThreshold(baseR0: ReproductionNumber): KernelResult<ImmunityLevel>` — `p* = 1 − 1/R_0`; rejects `R_0 ≤ 1` where no herd-immunity threshold exists.

## Invariants the caller must preserve

- `EpitopeSequence` is uppercase and over `{A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, U, V, W, Y}`. This covers both nucleotide epitopes (A, C, G, T, U) and protein epitopes (the 20 standard amino acids). Length 1..64.
- `AffinityScore` and `ImmunityLevel` are in `[0, 1]`.
- `DoseAmount` and `DecayRate` are non-negative finite.
- `ReproductionNumber` is non-negative finite; `herdImmunityThreshold` further requires `R_0 > 1`.
- `boosterResponse` interpolates monotonically in `doseSize`; `boosterResponse` with dose 0 returns the previous immunity unchanged.

## What this module does NOT do

- Does **not** integrate the SIR ODE. Use `core/dynamical-systems` with the
  helpers from this kernel as parameter inputs.
- Does **not** model individual-level clonal selection, somatic hypermutation,
  or B-cell receptor affinity maturation.
- Does **not** model contact-network heterogeneity. The herd-immunity formula
  is the textbook mass-action one.
- Does **not** model adverse events or vaccine schedules.
- Does **not** render anything.

## When to consider this module

Use `core/immunology` when a sim needs an antigen-antibody match score, a
booster-response curve as a function of dose and prior immunity, exponential
immunity waning over days, or the herd-immunity-threshold relationship between
`R_0` and the vaccinated fraction. If a container is about to inline
`1 - 1 / R0`, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the epitope alphabet,
   - changes the brand identity of any exported type,
   - changes the booster combination rule,
   - changes the herd-immunity formula.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Hard-coding pathogen-specific parameter sets.
- Adding stochastic noise to the deterministic helpers.
- Inventing a "vaccine type" enumeration.
