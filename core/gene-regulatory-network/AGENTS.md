# core/gene-regulatory-network · agent contract

## What this module is

The deterministic gene-expression kinetics kernel: Hill-form
activation/repression regulators, transcription / translation /
degradation rates, and a single forward-Euler step for an mRNA + protein
node. It owns the small, recurring equations behind gene-expression and
gene-regulatory-network containers so sims do not hand-roll the Hill function
or accidentally choose a sign convention.

This kernel intentionally stays at **one-node deterministic kinetics**. It
does not own a stochastic Gillespie simulator, multi-node sparse-matrix
network integration, or any nucleotide-level sequence math (use
`core/sequence` for that).

## Public interface

Exports from `@paideia/gene-regulatory-network`:

- `type RateConstant` — branded number, per-second (`s^-1`).
- `type MolarConcentration` — branded number, micromolar (µM).
- `type RegulationFactor` — branded number in `[0, 1]`.
- `type HillCoefficient` — branded number > 0.
- `type RegulatorKind` — `"activator" | "repressor"`.
- `interface Regulator` — `{ kind; inducer; threshold; hillCoefficient }`.
- `interface ExpressionState` — `{ mRna: MolarConcentration; protein: MolarConcentration }`.
- `interface ExpressionParams`:
  - `basalTranscriptionRate: RateConstant`
  - `maxTranscriptionRate: RateConstant`
  - `translationRatePerMrna: RateConstant`
  - `mRnaDegradationRate: RateConstant`
  - `proteinDegradationRate: RateConstant`
- `interface ExpressionDerivatives` — `{ dMrnaDt: number; dProteinDt: number }` (rates in µM·s⁻¹).
- `rateConstant(value: number): KernelResult<RateConstant>`
- `molarConcentration(value: number): KernelResult<MolarConcentration>`
- `hillCoefficient(value: number): KernelResult<HillCoefficient>`
- `regulationFactor(value: number): KernelResult<RegulationFactor>`
- `hillActivate(inducer: MolarConcentration, threshold: MolarConcentration, hillCoefficient: HillCoefficient): KernelResult<RegulationFactor>` — `R = I^n / (K^n + I^n)`.
- `hillRepress(repressor: MolarConcentration, threshold: MolarConcentration, hillCoefficient: HillCoefficient): KernelResult<RegulationFactor>` — `R = K^n / (K^n + I^n)`.
- `applyRegulator(regulator: Regulator): KernelResult<RegulationFactor>` — dispatches `hillActivate` or `hillRepress`.
- `transcriptionRate(params: ExpressionParams, regulation: RegulationFactor): KernelResult<RateConstant>` — `α₀ + (α_max − α₀) · R`.
- `expressionDerivatives(state: ExpressionState, params: ExpressionParams, regulation: RegulationFactor): KernelResult<ExpressionDerivatives>` — `dM/dt = transcription − k_M · M`, `dP/dt = k_translation · M − k_P · P`.
- `stepGeneExpression(state: ExpressionState, params: ExpressionParams, regulation: RegulationFactor, dt: number): KernelResult<ExpressionState>` — single forward-Euler step. Clamps both species to `[0, ∞)` after the step to defeat tiny negative-Euler overshoots.

## Invariants the caller must preserve

- Rate constants and concentrations are non-negative finite numbers in their
  declared units (s⁻¹ and µM).
- Hill coefficients are strictly positive finite numbers; the typical
  introductory range is `[1, 4]` (no enforcement, but documented).
- `RegulationFactor` is in `[0, 1]`. The Hill helpers guarantee this; the
  explicit constructor exists so callers can supply a fixed override (e.g.
  unregulated gene with `R = 1`).
- The forward-Euler step uses the timestep supplied by the caller. The
  kernel does NOT adapt `dt`. Callers that need adaptive integration should
  consume `expressionDerivatives` and feed `core/dynamical-systems` instead.

## What this module does NOT do

- Does **not** simulate stochastic transcription (Gillespie, tau-leaping).
- Does **not** integrate multi-node networks. Use one
  `stepGeneExpression` per node and wire them together in the container, or
  graduate to `core/dynamical-systems` for a vector ODE.
- Does **not** model post-transcriptional regulation (miRNA, splicing).
- Does **not** model time-dependent or oscillatory regulators except
  implicitly through the caller-supplied `inducer` over time.
- Does **not** parse SBML, BioPAX, or any pathway file format.
- Does **not** render anything.

## When to consider this module

Use `core/gene-regulatory-network` when a sim needs the Hill function with
strict input validation, a transcription / translation rate, or a single
forward-Euler step on an mRNA + protein pair. If a container is about to
inline `inducer**n / (k**n + inducer**n)`, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the Hill convention,
   - changes the brand identity of any exported type,
   - changes the clamp-to-non-negative rule in `stepGeneExpression`.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Embedding stochastic noise inside the deterministic step. Stochastic models
  are a separate kernel.
- Special-casing organism families (`prokaryote`, `eukaryote`); a future
  organism-specific layer can compose this kernel.
